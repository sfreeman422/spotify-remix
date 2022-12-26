import express, { Router } from 'express';
import { AuthService } from '../services/auth/auth.service';

export const authController: Router = express.Router();

const authService = new AuthService();

// Used to initiate authorization workflow for spotify.
authController.get('/login', (_req, res) => {
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'authController',
      route: '/login',
      method: 'GET',
      time: new Date(),
      request: _req,
      message: 'login route hit',
    }),
  );
  authService.loginWithScope(res);
});

// Used once an authorization token is given to use by spotify.
authController.get('/login/callback', (req, res) => {
  console.log(
    JSON.stringify({
      level: 'error',
      name: 'authController',
      route: '/login/callback',
      method: 'GET',
      time: new Date(),
      request: req,
      message: `login/callback route hit`,
    }),
  );
  const { code, state } = req.query;
  if (state === null) {
    console.log(
      JSON.stringify({
        level: 'error',
        name: 'authController',
        route: '/login/callback',
        method: 'GET',
        time: new Date(),
        message: `missing code=${code} and state=${state} returning 500 for state mismatch`,
      }),
    );
    res.status(500).send('State mismatch');
  } else {
    console.log(
      JSON.stringify({
        level: 'log',
        name: 'authController',
        route: '/login/callback',
        method: 'GET',
        time: new Date(),
        message: `calling authService.getUserDataAndSaveUser(${code})`,
      }),
    );
    // This should eventually route to a page where a user can see what playlist they spotify / own.
    authService
      .getUserDataAndSaveUser(code as string)
      // We should maybe not put accessToken and refreshToken here but...
      .then(x => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'authController',
            route: '/login/callback',
            method: 'GET',
            time: new Date(),
            message: `authService.getUserDataAndSaveUser was successful - redirecting to /dashboard?accessToken=${x.accessToken}&refreshToken=${x.refreshToken}&spotifyId=${x.spotifyId}`,
          }),
        );
        res.redirect(`/dashboard?accessToken=${x.accessToken}&refreshToken=${x.refreshToken}&spotifyId=${x.spotifyId}`);
      })
      .catch(e => {
        console.error(
          JSON.stringify({
            level: 'log',
            name: 'authController',
            route: '/login/callback',
            method: 'GET',
            time: new Date(),
            message: `authService.getUserDataAndSaveUser failed`,
            error: e,
          }),
        );
        res.status(500).send(e);
      });
  }
});

authController.get('/refresh', async (req, res) => {
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'authController',
      route: '/refresh',
      method: 'GET',
      time: new Date(),
      request: req,
      message: `/refresh route hit - making call to authService.refreshTokens()`,
    }),
  );
  const { authorization, refreshtoken } = req.headers;
  const { spotifyId } = req.query;
  const accessToken = authorization ? authorization.split(' ')[1] : undefined;
  if (accessToken && (spotifyId || refreshtoken)) {
    authService
      .refreshTokens(accessToken, refreshtoken as string, spotifyId as string)
      .then(x => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'authController',
            route: '/refresh',
            method: 'GET',
            time: new Date(),
            message: `authService.refreshTokens() call succeeded`,
          }),
        );
        res.send(x);
      })
      .catch(e => {
        console.error(
          JSON.stringify({
            level: 'log',
            name: 'authController',
            route: '/refresh',
            method: 'GET',
            time: new Date(),
            message: `authService.refreshTokens() call failed`,
            error: e,
          }),
        );
        res.status(500).send(e);
      });
  } else {
    console.log(
      JSON.stringify({
        level: 'log',
        name: 'authController',
        route: '/refresh',
        method: 'GET',
        time: new Date(),
        message: `returning 400 - missing authorization=${!authorization}, missing spotifyId=${!spotifyId} or missing refreshToken=${!refreshtoken}`,
      }),
    );
    res.status(400).send('Missing authorization header or spotifyId');
  }
});
