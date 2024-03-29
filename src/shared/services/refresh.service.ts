import request from 'request';
import { UserService } from '../../services/user/user.service';
import { TokenSet } from '../../services/auth/auth.interfaces';
import { User } from '../db/models/User';

export class RefreshService {
  public static getInstance(): RefreshService {
    if (!RefreshService.instance) {
      RefreshService.instance = new RefreshService();
    }
    return RefreshService.instance;
  }
  private static instance: RefreshService;
  MAX_RETRIES = 3;

  userService = new UserService();
  inflightRefreshes: Record<string, Promise<User | undefined> | undefined> = {};

  public refresh(accessToken: string, refreshToken?: string, spotifyId?: string): Promise<User | undefined> {
    const identifier = spotifyId || refreshToken || accessToken;

    if (this.inflightRefreshes[identifier]) {
      return this.inflightRefreshes[identifier] as Promise<User>;
    } else {
      this.inflightRefreshes[identifier] = this.refreshToken(accessToken, refreshToken, spotifyId);
      // Hella ghetto dawg - deletes the key in inflightRefreshes after 60 seconds.
      setTimeout(() => delete this.inflightRefreshes[identifier], 60000);
      return this.inflightRefreshes[identifier] as Promise<User>;
    }
  }

  private async refreshToken(
    accessToken: string,
    refreshToken?: string,
    spotifyId?: string,
    retryCount = 0,
  ): Promise<User | undefined> {
    let user: User | null;
    if (spotifyId) {
      user = await this.userService.getUser({ spotifyId });
    } else if (refreshToken) {
      user = await this.userService.getUser({ refreshToken });
    } else {
      user = await this.userService.getUser({ accessToken });
    }

    console.log('Refreshing token for user:');
    console.log(user?.spotifyId);

    if (user) {
      const reqOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          refresh_token: user.refreshToken,
          // eslint-disable-next-line @typescript-eslint/camelcase
          grant_type: 'refresh_token',
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
      return new Promise((resolve: (tokenSet: TokenSet) => void, reject) => {
        request.post(reqOptions, (err, response, body) => {
          if (!err && response.statusCode === 200) {
            const accessToken = body.access_token;
            const refreshToken = body.refresh_token || user?.refreshToken;
            resolve({ user, accessToken, refreshToken } as TokenSet);
          } else {
            console.error(err);
            reject(response || err);
          }
        });
      })
        .then((tokens: TokenSet) => {
          const tokenSet = tokens;
          if (tokens && tokenSet.user) {
            const updatedUser = tokenSet.user;
            updatedUser.accessToken = tokenSet.accessToken;
            updatedUser.refreshToken = tokenSet.refreshToken;
            return this.userService.updateExistingUser(updatedUser);
          }
          return undefined;
        })
        .catch(e => {
          console.error(e);
          return retryCount < this.MAX_RETRIES
            ? this.refreshToken(accessToken, refreshToken, spotifyId, retryCount + 1)
            : undefined;
        });
    }
    return undefined;
  }
}
