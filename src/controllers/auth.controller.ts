/* eslint-disable @typescript-eslint/camelcase */
import request from 'request';
import express, { Router } from 'express';
import * as querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../services/user/user.service';

export const authController: Router = express.Router();

const userService = new UserService();
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
    const reqOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code,
        redirect_uri: process.env.SPOTIFY_TOKEN_REDIRECT_URL,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      json: true,
    };

    console.log(reqOptions);

    request.post(reqOptions, (err, response, body) => {
      console.log(response.statusCode);
      console.log(response.statusMessage);
      console.log(response.body);
      if (!err && response.statusCode === 200) {
        console.log('success');
        console.log(body);
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        console.log(access_token);
        console.log(refresh_token);

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { Authorization: 'Bearer ' + access_token },
          json: true,
        };

        // use the access token to access the Spotify Web API
        request.get(options, async (_e, _r, b) => {
          console.log('end');
          console.log(b);
          await userService.saveUser(access_token, refresh_token, b.id).then(() => res.status(200).send());
        });
      } else {
        console.log(err);
        res.status(500).send(err);
      }
    });
  }
});
