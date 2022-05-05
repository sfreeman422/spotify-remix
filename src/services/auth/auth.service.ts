/* eslint-disable @typescript-eslint/camelcase */
import axios from 'axios';
import { Response } from 'express';
import * as querystring from 'querystring';
import request from 'request';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../shared/db/models/User';
import { UserService } from '../user/user.service';
import { TokenSet, SpotifyUserData } from './auth.interfaces';

export class AuthService {
  userService = new UserService();

  loginWithScope(res: Response): void {
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
  }

  getTokens(code: string): Promise<TokenSet> {
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

    /// Wish we could use Axios here to remove the request dependency but I could not get Axios to play nice with application/x-www-form-urlencoded when hitting spotify api.
    return new Promise((resolve, reject) => {
      request.post(reqOptions, (err, response, body) => {
        if (!err && response.statusCode === 200) {
          const accessToken = body.access_token;
          const refreshToken = body.refresh_token;
          resolve({ accessToken, refreshToken });
        } else {
          reject(err);
        }
      });
    });
  }

  getUserData(accessToken: string): Promise<SpotifyUserData> {
    return axios
      .get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
      .then(response => {
        return response.data;
      })
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  async getUserDataAndSaveUser(code: string): Promise<User> {
    const tokens = await this.getTokens(code).catch(e => {
      console.error(e);
      throw new Error(e);
    });
    const userData = await this.getUserData(tokens.accessToken).catch(e => {
      console.error(e);
      throw new Error(e);
    });
    console.log(tokens);
    console.log(userData);
    return this.userService.saveUser(tokens.accessToken, tokens.refreshToken, userData.id);
  }
}
