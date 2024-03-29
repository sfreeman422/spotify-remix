import axios, { AxiosResponse } from 'axios';
import { User } from '../../shared/db/models/User';
import {
  SpotifyLikedSong,
  SpotifyPlaylist,
  SpotifyPlaylistItemInfo,
  SpotifyResponse,
  SpotifyTrack,
  SpotifyUserData,
} from './spotify-http.interface';
import { SongsByUser, SongWithUserData } from './spotify.interface';

export class SpotifyHttpService {
  baseUrl = 'https://api.spotify.com/v1';
  baseSelfUrl = `${this.baseUrl}/me`;
  baseUserUrl = `${this.baseUrl}/users`;
  basePlaylistUrl = `${this.baseUrl}/playlists`;

  getUserData(accessToken: string): Promise<SpotifyUserData> {
    return axios
      .get(this.baseSelfUrl, {
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

  getUserPlaylists(accessToken: string): Promise<AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>> {
    return axios
      .get<SpotifyResponse<SpotifyPlaylist[]>>(`${this.baseSelfUrl}/playlists`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then(response => {
        if (!response) {
          // This sucks, we need a way to reliably know what error status was returned by the get call.
          throw new Error('Unable to authenticate user');
        }
        return response;
      })
      .catch(e => {
        console.log(e);
        throw e;
      });
  }

  createUserPlaylist(accessToken: string, user: User): Promise<AxiosResponse> {
    return axios
      .post(
        `${this.baseUserUrl}/${user.spotifyId}/playlists`,
        {
          name: `${user.spotifyId}'s Remix`,
          public: true,
          collaborative: false,
          description: 'Playlist generated by remix.lol',
        },
        {
          headers: {
            Authorization: accessToken,
          },
        },
      )
      .then(playlist => {
        return axios
          .put(
            `${this.basePlaylistUrl}/${playlist.data.id}`,
            {
              description: `Subscribe and get info about this playlist at ${process.env.SPOTIFY_REMIX_BASE_URL}/playlist?playlistId=${playlist.data.id}`,
            },
            {
              headers: {
                Authorization: accessToken,
                'Content-Type': 'application/json',
              },
            },
          )
          .then(() => playlist);
      })
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  subscribeToPlaylist(accessToken: string, playlistId: string) {
    return axios
      .put(
        `${this.basePlaylistUrl}/${playlistId}/followers`,
        {
          public: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  getPlaylistTracks(
    playlistId: string,
    accessToken: string,
    url = `${this.basePlaylistUrl}/${playlistId}/tracks?limit=50`,
  ): Promise<SpotifyPlaylistItemInfo[]> {
    return axios
      .get<SpotifyResponse<SpotifyPlaylistItemInfo[]>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then<SpotifyPlaylistItemInfo[]>(
        (x: AxiosResponse<SpotifyResponse<SpotifyPlaylistItemInfo[]>>): Promise<SpotifyPlaylistItemInfo[]> => {
          const playlistTracks = x.data.items;

          if (x.data.next) {
            return this.getPlaylistTracks(playlistId, accessToken, x.data.next).then((x: SpotifyPlaylistItemInfo[]) =>
              playlistTracks.concat(x),
            );
          }
          return new Promise(resolve => resolve(playlistTracks));
        },
      );
  }

  removeAllPlaylistTracks(playlistId: string, accessToken: string, tracks: SpotifyPlaylistItemInfo[]): any {
    return axios.delete(`${this.basePlaylistUrl}/${playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        tracks: tracks.map(x => ({
          uri: x.track.uri,
        })),
      },
    });
  }

  addSongsToPlaylist(accessToken: string, playlistId: string, playlistSongs: SongWithUserData[]) {
    return axios.post(
      `${this.basePlaylistUrl}/${playlistId}/tracks`,
      {
        uris: playlistSongs.map(song => song.uri),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }

  getTopSongsByUser(
    user: User,
    url = `${this.baseSelfUrl}/top/tracks?limit=50&time_range=short_term`,
  ): Promise<SongsByUser> {
    const headers = {
      Authorization: `Bearer ${user.accessToken}`,
    };
    return axios
      .get<SpotifyResponse<SpotifyTrack[]>>(url, { headers })
      .then<SongsByUser>(
        (x: AxiosResponse<SpotifyResponse<SpotifyTrack[]>>): Promise<SongsByUser> => {
          const songs = x.data.items.map(
            (song: SpotifyTrack): SongWithUserData => ({
              ...song,
              spotifyId: user.spotifyId,
            }),
          );

          if (x.data.next) {
            return this.getTopSongsByUser(user, x.data.next).then((data: SongsByUser) => ({
              user: user,
              topSongs: songs.concat(data.topSongs),
              likedSongs: [],
            }));
          }
          return Promise.resolve({ user, topSongs: songs, likedSongs: [] });
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  getLikedSongsByUser(user: User, url = `${this.baseSelfUrl}/tracks?limit=50`): Promise<SongsByUser> {
    return axios
      .get<SpotifyResponse<SpotifyLikedSong[]>>(url, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      })
      .then<SongsByUser>(
        (x: AxiosResponse<SpotifyResponse<SpotifyLikedSong[]>>): Promise<SongsByUser> => {
          const songs = x.data.items.map(
            (song: SpotifyLikedSong): SongWithUserData =>
              Object.assign(song.track, {
                spotifyId: user.spotifyId,
              }),
          );

          if (x.data.next) {
            return this.getLikedSongsByUser(user, x.data.next).then(data => ({
              user,
              topSongs: [], // Dont love this.
              likedSongs: songs.concat(data.likedSongs || []),
            }));
          }
          return new Promise(resolve => resolve({ user, topSongs: [], likedSongs: songs }));
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }
}
