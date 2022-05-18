import axios, { AxiosResponse } from 'axios';
import { isWithinInterval, subHours } from 'date-fns';
import { Playlist } from '../../shared/db/models/Playlist';
import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
import { QueueService } from '../../shared/services/queue.service';
import { UserService } from '../user/user.service';
import {
  SpotifyLikedSong,
  SpotifyPlaylist,
  SpotifyPlaylistItemInfo,
  SpotifyResponse,
  SpotifyTrack,
  SpotifyUserData,
} from './spotify.generated.interface';
import { PlaylistData, SongWithUserData } from './spotify.interface';

export class SpotifyService {
  baseUrl = 'https://api.spotify.com/v1';
  baseSelfUrl = `${this.baseUrl}/me`;
  baseUserUrl = `${this.baseUrl}/users`;
  basePlaylistUrl = `${this.baseUrl}/playlists`;

  userService = new UserService();
  queueService = QueueService.getInstance();

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

  async getUserPlaylists(accessToken: string): Promise<PlaylistData> {
    const user: User[] | undefined = await this.userService.getUserWithRelations({
      where: { accessToken },
      relations: ['memberPlaylists', 'ownedPlaylists'],
    });
    return axios
      .get<SpotifyResponse<SpotifyPlaylist[]>>(`${this.baseSelfUrl}/playlists`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then(
        (resp: AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>): PlaylistData => {
          if (resp) {
            const spotifyPlaylists: SpotifyPlaylist[] = resp.data.items;
            if (user) {
              const createdPlaylists = user[0]?.ownedPlaylists?.map(x => x.playlistId) || [];
              const memberPlaylists =
                user[0]?.memberPlaylists?.map(x => x.playlistId)?.filter(x => !createdPlaylists?.includes(x)) || [];

              const orphanPlaylists = createdPlaylists.filter(x => !spotifyPlaylists.find(y => x === y.id));
              const ownedPlaylists = spotifyPlaylists.filter(x => createdPlaylists?.includes(x.id));
              const subscribedPlaylists = spotifyPlaylists.filter(x => memberPlaylists?.includes(x.id));

              return {
                ownedPlaylists,
                orphanPlaylists,
                subscribedPlaylists,
              };
            }
            return { ownedPlaylists: [], orphanPlaylists: [], subscribedPlaylists: [] };
          }
          return { ownedPlaylists: [], orphanPlaylists: [], subscribedPlaylists: [] };
        },
      )
      .catch(e => {
        console.log(e);
        throw new Error(e);
      });
  }

  createUserPlaylist(accessToken: string): Promise<any> {
    return this.userService.getUser({ accessToken: accessToken.split(' ')[1] }).then(user => {
      if (user) {
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
              .then(_ => {
                console.log(_);
                return playlist;
              });
          })
          .then(playlist => {
            return this.userService
              .savePlaylist(user, playlist.data.id)
              .then(playlist => this.refreshPlaylist(playlist.playlistId));
          });
      } else {
        throw new Error('Unable to find user');
      }
    });
  }

  async removePlaylist(accessToken: string, playlists: string[]): Promise<Playlist[]> {
    const ownedPlaylists = await this.userService.getAllOwnedPlaylists(accessToken);
    const playlistsOwnedAndToBeDeleted: Playlist[] = ownedPlaylists.filter(x =>
      playlists.some(y => x.playlistId === y),
    );
    return this.userService.deletePlaylist(playlistsOwnedAndToBeDeleted);
  }

  unsubscribeFromPlaylist(_accessToken: string, _playlistId: string): void {
    console.log('not yet implemented');
  }

  async subscribeToPlaylist(accessToken: string, playlistId: string): Promise<Playlist | undefined> {
    const user = await this.userService.getUserWithRelations({
      where: { accessToken },
      relations: ['memberPlaylists', 'ownedPlaylists'],
    });

    const playlist = await this.userService.getPlaylist(playlistId);
    if (user?.length && playlist[0]) {
      const userWithPlaylist = user[0];
      const isUserAlreadyMember = userWithPlaylist.memberPlaylists?.map(x => x.playlistId).includes(playlistId);
      if (isUserAlreadyMember) {
        return undefined;
      } else {
        return await axios
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
          .then(_ => this.userService.updatePlaylistMembers(user[0], playlist[0]))
          .catch(e => {
            console.error(e);
            throw new Error(e);
          });
      }
    }
    return undefined;
  }

  async getTopSongs(members: User[]): Promise<SongWithUserData[]> {
    return members?.length
      ? await (await Promise.all(members.map(async (member: User) => this.getTopSongsByUser(member)))).flat()
      : [];
  }

  async getLikedSongs(members: User[]): Promise<SongWithUserData[]> {
    return members?.length
      ? await (await Promise.all(members.map(async (member: User) => this.getLikedSongsByUser(member)))).flat()
      : [];
  }

  async getAllMusic(members: User[], songsPerUser: number, history: Song[]): Promise<SongWithUserData[]> {
    // Get only the top songs first, these are likely more relevant.
    let allMusic: SongWithUserData[] = await this.getTopSongs(members);
    // Filter these songs based on what we have already seen in this playlist within the last 12 hours.
    // We chose 12 hours because we want to allow the same songs to show up if a playlist is being frequently joined,
    // But we dont want it to show up if its already been seen within the past day.
    const historyAsStrings: string[] = history
      .filter(song => !isWithinInterval(song.createdAt, { start: subHours(new Date(), 12), end: new Date() }))
      .map(x => x.spotifyUrl);

    allMusic = allMusic.filter(x => !historyAsStrings.includes(x.uri));

    // If we dont have enough songs, get the liked songs, filter for the songs that we already got in our top tracks and concat.
    if (allMusic.length < songsPerUser * members.length) {
      let likedSongs: SongWithUserData[] = await this.getLikedSongs(members);
      likedSongs = likedSongs.filter(x => !allMusic.includes(x));
      allMusic = allMusic.concat(likedSongs);
    }

    const playlistSongs: SongWithUserData[] = [];
    const randomNumbers: Record<number, boolean> = {};

    let count = 0;
    while (count < songsPerUser * members.length) {
      const randomNumber = Math.floor(Math.random() * (allMusic.length - 1));
      if (!randomNumbers[randomNumber]) {
        randomNumbers[randomNumber] = true;
        playlistSongs.push(allMusic[randomNumber]);
        count += 1;
      }
    }
    return playlistSongs;
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

  refreshPlaylist(playlistId: string): Promise<void> {
    const identifier = `playlist-${playlistId}`;
    const queue = this.queueService.queue<Playlist[]>(identifier, () => this.populatePlaylist(playlistId));
    if (queue.length === 1) {
      return this.queueService.dequeue(identifier);
    } else {
      return new Promise((resolve, _reject) => {
        resolve();
      });
    }
  }

  private async populatePlaylist(playlistId: string): Promise<Playlist[]> {
    const playlist = await this.userService.getPlaylist(playlistId).then(playlist => {
      return playlist[0];
    });
    const { members, history, owner } = playlist;

    const songsPerUser = this.getNumberOfItemsPerUser(members.length);
    const music: SongWithUserData[] = await this.getAllMusic(members, songsPerUser, history);
    const orderedPlaylist: SongWithUserData[] = this.roundRobinSort(music);
    // Get all songs from the playlist.
    const playlistTracks: SpotifyPlaylistItemInfo[] = await this.getPlaylistTracks(playlistId, owner.accessToken);
    // Remove all songs from the playlist.
    await this.removeAllPlaylistTracks(playlistId, owner.accessToken, playlistTracks);
    return axios
      .post(
        `${this.basePlaylistUrl}/${playlistId}/tracks`,
        {
          uris: orderedPlaylist.map(song => song.uri),
        },
        {
          headers: {
            Authorization: `Bearer ${owner.accessToken}`,
          },
        },
      )
      .then(_ => this.userService.saveSongs(playlist, orderedPlaylist))
      .catch(e => e);
  }

  // Note: This sort is a "best effort" to maintain order within the playlist.
  // If a failure occurs or one request completes sooner than another the order will not be maintained.
  roundRobinSort(arr: SongWithUserData[]): SongWithUserData[] {
    const allSongs = arr;
    let sortedArr: SongWithUserData[] = [];
    while (allSongs.length > 0) {
      const orderedSet: SongWithUserData[] = [];
      for (let i = 0; i < allSongs.length; i += 1) {
        const found = orderedSet.find(element => element.spotifyId === allSongs[i].spotifyId);
        if (!found) {
          orderedSet.push(allSongs[i]);
          allSongs.splice(i, 1);
          i -= 1;
        }
      }
      sortedArr = sortedArr.concat(orderedSet).flat();
    }
    return sortedArr;
  }

  // This function sucks, but basically if we have under 10 ppl, use 48 songs total, if we have more than 10, use 6 songs each.
  getNumberOfItemsPerUser(numberOfUsers: number): number {
    const minSongsPerUser = 6;
    const songsPerUser = numberOfUsers * 6;
    const maxNumberOfSongs = 48;
    return songsPerUser > maxNumberOfSongs ? minSongsPerUser : Math.round(maxNumberOfSongs / numberOfUsers);
  }

  private getTopSongsByUser(
    user: User,
    url = `${this.baseSelfUrl}/top/tracks?limit=50&time_range=short_term`,
  ): Promise<SongWithUserData[]> {
    return axios
      .get<SpotifyResponse<SpotifyTrack[]>>(url, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      })
      .then<SongWithUserData[]>(
        (x: AxiosResponse<SpotifyResponse<SpotifyTrack[]>>): Promise<SongWithUserData[]> => {
          const songs = x.data.items.map(
            (song: SpotifyTrack): SongWithUserData => ({
              ...song,
              spotifyId: user.spotifyId,
            }),
          );

          if (x.data.next) {
            return this.getTopSongsByUser(user, x.data.next).then(nextSongs => songs.concat(nextSongs));
          }
          return new Promise((resolve, _reject) => resolve(songs));
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  private getLikedSongsByUser(user: User, url = `${this.baseSelfUrl}/tracks?limit=50`): Promise<SongWithUserData[]> {
    return axios
      .get<SpotifyResponse<SpotifyLikedSong[]>>(url, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      })
      .then<SongWithUserData[]>(
        (x: AxiosResponse<SpotifyResponse<SpotifyLikedSong[]>>): Promise<SongWithUserData[]> => {
          const songs = x.data.items.map(
            (song: SpotifyLikedSong): SongWithUserData =>
              Object.assign(song.track, {
                spotifyId: user.spotifyId,
              }),
          );

          if (x.data.next) {
            return this.getLikedSongsByUser(user, x.data.next).then(nextSongs => songs.concat(nextSongs));
          }
          return new Promise((resolve, _reject) => resolve(songs));
        },
      )
      .catch(e => {
        console.error(e);
        throw new Error(e);
      });
  }

  getPlaylistHistory(playlistId: string): Promise<Song[]> {
    return this.userService.getPlaylistHistory(playlistId);
  }
}
