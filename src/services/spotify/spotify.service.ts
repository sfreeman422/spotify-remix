import axios from 'axios';
import { SpotifyUserData } from './spotify.interface';

export class SpotifyService {
  baseUserUrl = 'https://api.spotify.com/v1/me';
  getUserData(accessToken: string): Promise<SpotifyUserData> {
    return axios
      .get(this.baseUserUrl, {
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

  getUserPlaylists(accessToken: string): Promise<any> {
    return axios.get(this.baseUserUrl + '/playlists', {
      headers: {
        Authorization: accessToken,
      },
    });
  }

  createUserPlaylist(_accessToken: string) {
    console.log('not yet implemented');
  }

  removeUserPlaylist(_accessToken: string) {
    console.log('not yet implemented');
  }

  subscribeToPlaylist(_accessToken: string, _playlistId: string) {
    console.log('not yet implemented');
  }
}
