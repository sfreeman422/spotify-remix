import axios from 'axios';
import { SpotifyUserData } from './spotify.interface';

export class SpotifyService {
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
}
