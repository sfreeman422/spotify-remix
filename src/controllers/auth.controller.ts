import express, { Router } from 'express';
import { AuthService } from '../services/auth/auth.service';

export const authController: Router = express.Router();

const authService = new AuthService();

// Used to initiate authorization workflow for spotify.
authController.get('/login', (_req, res) => {
  authService.loginWithScope(res);
});

// Used once an authorization token is given to use by spotify.
authController.get('/login/callback', (req, res) => {
  const { code, state } = req.query;
  if (state === null) {
    res.status(500).send('State mismatch');
  } else {
    // This should eventually route to a page where a user can see what playlist they spotify / own.
    authService
      .getUserDataAndSaveUser(code as string)
      // We should maybe not put accessToken and refreshToken here but...
      .then(x => res.redirect(`/dashboard?accessToken=${x.accessToken}&refreshToken=${x.refreshToken}`))
      .catch(e => res.status(500).send(e));
  }
});
