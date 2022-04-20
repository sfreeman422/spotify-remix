/* eslint-disable @typescript-eslint/camelcase */
import axios from 'axios';
import express, { Router } from 'express';
import * as querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth/auth.service';

export const authController: Router = express.Router();

const authService = new AuthService();
// Used to initiate authorization workflow for spotify.
authController.get('/login', (_req, res) => {
  const state = uuidv4();
  const scope = 'user-read-private user-read-email playlist-modify-public user-top-read';
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.SPOTIFY_TOKEN_REDIRECT_URL,
        state: state,
      }),
  );
});

// Used once an authorization token is given to use by spotify.
authController.get('/login/callback', (req, res) => {
  const { code, state } = req.query;
  if (state === null) {
    res.status(500).send('State mismatch');
  } else {
    axios
      .post(
        'https://accounts.spotify.com/api/token',
        {
          code: code,
          redirect_uri: process.env.SPOTIFY_SUCCESS_REDIRECT_URL,
          grant_type: 'authorization_code',
        },
        {
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
          },
        },
      )
      .then(() => res.redirect(process.env.SPOTIFY_SUCCESS_REDIRECT_URL as string));
  }
});

authController.get('/login/success', (req, res) => {
  // Take the token and save it in the DB.
  authService.saveUser(req.body.code, '123').then(() => res.status(200).send());
});
