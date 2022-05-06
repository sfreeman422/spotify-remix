import request from 'request';
import { UserService } from '../../services/user/user.service';
import { TokenSet } from '../../services/auth/auth.interfaces';

export class RefreshService {
  userService = new UserService();
  currentlyRefreshing: Record<string, Promise<any> | undefined> = {};

  // Some weird type stuff going on in here..
  // Why do we need promise<any>
  public refresh(accessToken: string): Promise<any> {
    if (this.currentlyRefreshing[accessToken]) {
      return this.currentlyRefreshing[accessToken] as Promise<any>;
    } else {
      this.currentlyRefreshing[accessToken] = this.refreshToken(accessToken);
      // Hella ghetto dawg - deletes the key in currentlyRefreshing after 60 seconds.
      setTimeout(() => delete this.currentlyRefreshing[accessToken], 60000);
      return this.currentlyRefreshing[accessToken] as Promise<any>;
    }
  }

  private async refreshToken(accessToken: string): Promise<TokenSet | undefined> {
    console.log(accessToken);
    const user = await this.userService.getUser({ accessToken });
    console.log(user);
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
      return new Promise((resolve, reject) => {
        request.post(reqOptions, (err, response, body) => {
          if (!err && response.statusCode === 200) {
            const accessToken = body.access_token;
            const refreshToken = body.refresh_token;
            resolve({ user, accessToken, refreshToken } as TokenSet);
          } else {
            reject(err);
          }
        });
      }).then(tokens => {
        const tokenSet = (tokens as unknown) as TokenSet;
        console.log(tokens);
        if (tokens && tokenSet.user) {
          const updatedUser = tokenSet.user;
          updatedUser.accessToken = tokenSet.accessToken;
          updatedUser.refreshToken = tokenSet.refreshToken;
          return this.userService.updateExistingUser(updatedUser);
        }
        return undefined;
      });
    }
    return undefined;
  }
}
