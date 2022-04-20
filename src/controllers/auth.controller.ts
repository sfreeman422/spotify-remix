/* eslint-disable @typescript-eslint/camelcase */
import express, { Router } from 'express';
import * as querystring from 'querystring';
import Uuid from 'uuid';

export const authController: Router = express.Router();

authController.get('/login', (_req, res) => {
  const state = Uuid.v4();
  const scope = 'user-read-private user-read-email';
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URL,
        state: state,
      }),
  );
});
