/* eslint-disable @typescript-eslint/camelcase */
import { Response } from 'express';
import * as querystring from 'querystring';
import request from 'request';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../shared/db/models/User';
import { SpotifyService } from '../spotify/spotify.service';
import { UserService } from '../user/user.service';
import { TokenSet } from './auth.interfaces';

export class AuthService {
  userService = new UserService();
  spotifyService = new SpotifyService();
  loginWithScope(res: Response): void {
    const state = uuidv4();
    const playlistScopes = [
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-collaborative',
      'playlist-read-private',
    ];
    const userScopes = [
      'user-top-read',
      'user-library-read',
      'user-follow-read',
      'user-follow-modify',
      'user-read-email',
      'user-read-private',
    ];
    const scope = playlistScopes.concat(userScopes).join(' ');
    console.log(scope);
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

  async getUserDataAndSaveUser(code: string): Promise<User> {
    const tokens = await this.getTokens(code).catch(e => {
      console.error(e);
      throw new Error(e);
    });
    const userData = await this.spotifyService.getUserData(tokens.accessToken).catch(e => {
      console.error(e);
      throw new Error(e);
    });
    return this.userService.saveUser(tokens.accessToken, tokens.refreshToken, userData.id);
  }
}
