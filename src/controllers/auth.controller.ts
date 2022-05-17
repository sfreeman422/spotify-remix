import express, { Router } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { User } from '../shared/db/models/User';

export const authController: Router = express.Router();

const authService = new AuthService();

// Used to initiate authorization workflow for spotify.
authController.get('/login', (_req, res) => {
  console.log('/login hit');
  authService.loginWithScope(res);
});

// Used once an authorization token is given to use by spotify.
authController.get('/login/callback', (req, res) => {
  const { code, state } = req.query;
  if (state === null) {
    res.status(500).send('State mismatch');
  } else {
    console.log('/login/callback hit');
    // This should eventually route to a page where a user can see what playlist they spotify / own.
    authService
      .getUserDataAndSaveUser(code as string)
      // We should maybe not put accessToken and refreshToken here but...
      .then(x => {
        console.log(
          `redirecting to /dashboard?accessToken=${x.accessToken}&refreshToken=${x.refreshToken}&spotifyId=${x.spotifyId}`,
        );
        res.redirect(`/dashboard?accessToken=${x.accessToken}&refreshToken=${x.refreshToken}&spotifyId=${x.spotifyId}`);
      })
      .catch(e => {
        console.error('error on /login/callback');
        console.error(e);
        res.status(500).send(e);
      });
  }
});

authController.get('/refresh', async (req, res) => {
  const { authorization } = req.headers;
  const { spotifyId } = req.query;
  if (authorization && spotifyId) {
    const accessToken = authorization.split(' ')[1];
    const tokens: User | undefined = await authService.refreshTokens(accessToken, spotifyId as string);
    if (tokens) {
      res.send(tokens);
    } else {
      res.status(500).send('Unable to refresh token');
    }
  } else {
    res.status(400).send('Missing authorization header or spotifyId');
  }
});
