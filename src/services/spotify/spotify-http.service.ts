import axios, { AxiosResponse } from 'axios';
import { User } from '../../shared/db/models/User';
import {
  SpotifyLikedSong,
  SpotifyPlaylist,
  SpotifyPlaylistItemInfo,
  SpotifyResponse,
  SpotifyTrack,
  SpotifyUserData,
} from './spotify.generated.interface';
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
      .catch(e => {
        console.log(e);
        throw new Error(e);
      });
  }

  createUserPlaylist(accessToken: string, user: User): Promise<any> {
    return axios
      .post(
        `${this.baseUserUrl}/${user.spotifyId}/playlists`,
        {
          name: `${user.spotifyId}'s Remix Playlist`,
          public: false,
          collaborative: true,
          description: 'Playlist generated by SpotifyRemix',
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
          .then(_ => playlist);
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

  getPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyPlaylistItemInfo[]> {
    return axios
      .get<SpotifyResponse<SpotifyPlaylistItemInfo[]>>(`${this.basePlaylistUrl}/${playlistId}/tracks?limit=50`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((x: AxiosResponse<SpotifyResponse<SpotifyPlaylistItemInfo[]>>): SpotifyPlaylistItemInfo[] => x.data.items);
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
    return axios
      .get<SpotifyResponse<SpotifyTrack[]>>(url, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      })
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
            }));
          }
          return new Promise((resolve, _reject) => resolve({ user, topSongs: songs }));
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
          return new Promise((resolve, _reject) => resolve({ user, topSongs: [], likedSongs: songs }));
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }
}