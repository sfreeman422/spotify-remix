import axios, { AxiosResponse } from 'axios';
import { Playlist } from '../../shared/db/models/Playlist';
import { User } from '../../shared/db/models/User';
import { UserService } from '../user/user.service';
import {
  SpotifyLikedSong,
  SpotifyPlaylist,
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
              const ownedAndSubbedPlaylists =
                user[0]?.memberPlaylists?.concat(user[0]?.ownedPlaylists || [])?.map(x => x.playlistId) || [];
              const createdPlaylists = user[0]?.ownedPlaylists?.map(x => x.playlistId) || [];
              const memberPlaylists =
                user[0]?.memberPlaylists?.map(x => x.playlistId)?.filter(x => createdPlaylists?.includes(x)) || [];

              const orphanPlaylists = ownedAndSubbedPlaylists.filter(x => !spotifyPlaylists.find(y => x === y.id));
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
            return this.userService
              .savePlaylist(user, playlist.data.id)
              .then(playlist => this.populatePlaylist(playlist.playlistId));
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

  async subscribeToPlaylist(accessToken: string, playlistId: string): Promise<User | undefined> {
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
        const subscribedSpotifyPlaylist = await axios
          .post(
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
        if (subscribedSpotifyPlaylist) {
          const newList: Playlist[] | undefined = userWithPlaylist.memberPlaylists
            ? userWithPlaylist.memberPlaylists.map(x => x)
            : userWithPlaylist.memberPlaylists;
          if (newList) {
            newList.push(playlist[0]);
          }
          userWithPlaylist.memberPlaylists = newList;
          return this.userService.updateExistingUser(userWithPlaylist);
        }
      }
    }
    return undefined;
  }

  async getTopAndLikedSongs(members: User[], songsPerUser: number): Promise<SongWithUserData[]> {
    return members?.length
      ? await Promise.all(
          members.map(async (member: User) => {
            const userMusic = await Promise.all([
              axios
                .get<SpotifyResponse<SpotifyTrack[]>>(`${this.baseSelfUrl}/top/tracks?limit=50&time_range=short_term`, {
                  headers: {
                    Authorization: `Bearer ${member.accessToken}`,
                  },
                })
                .then<SongWithUserData[]>((x: AxiosResponse<SpotifyResponse<SpotifyTrack[]>>) =>
                  x.data.items.map(
                    (song: SpotifyTrack): SongWithUserData => ({
                      ...song,
                      accessToken: member.accessToken,
                      refreshToken: member.refreshToken,
                    }),
                  ),
                )
                .catch(e => {
                  console.error(e);
                  throw new Error(e);
                }),
              axios
                .get<SpotifyResponse<SpotifyLikedSong[]>>(`${this.baseSelfUrl}/tracks?limit=50`, {
                  headers: {
                    Authorization: `Bearer ${member.accessToken}`,
                  },
                })
                .then<SongWithUserData[]>((x: AxiosResponse<SpotifyResponse<SpotifyLikedSong[]>>): SongWithUserData[] =>
                  x.data.items.map(
                    (song: SpotifyLikedSong): SongWithUserData =>
                      Object.assign(song.track, {
                        accessToken: member.accessToken,
                        refreshToken: member.refreshToken,
                      }),
                  ),
                )
                .catch(e => {
                  console.error(e);
                  throw new Error(e);
                }),
            ]);

            const allMusic: SongWithUserData[] = userMusic.flat();
            const playlistSongs: SongWithUserData[] = [];
            const randomNumbers: Record<number, boolean> = {};
            let count = 0;
            while (count < songsPerUser) {
              const randomNumber = Math.floor(Math.random() * (allMusic.length - 1));
              if (!randomNumbers[randomNumber]) {
                randomNumbers[randomNumber] = true;
                playlistSongs.push(allMusic[randomNumber]);
                count += 1;
              }
            }
            return playlistSongs;
          }),
        ).then(x => x.flat())
      : [];
  }

  async populatePlaylist(playlistId: string): Promise<any[]> {
    const members = await this.userService.getPlaylist(playlistId).then(playlist => {
      return playlist[0]?.members;
    });
    const songsPerUser = this.getNumberOfItemsPerUser(members.length);
    // For each member, get most recently played + liked tracks and limit to the number of songs each user should provide.
    const music: SongWithUserData[] = await this.getTopAndLikedSongs(members, songsPerUser);
    const orderedPlaylist: SongWithUserData[] = this.roundRobinSort(music);

    return await Promise.all(
      orderedPlaylist.map(
        song =>
          new Promise((resolve, reject) => {
            axios
              .post(
                `${this.basePlaylistUrl}/${playlistId}/tracks`,
                {
                  uris: [song.uri],
                },
                {
                  headers: {
                    Authorization: `Bearer ${song.accessToken}`,
                  },
                },
              )
              .then(x => resolve(x))
              .catch(e => reject(e));
          }),
      ),
    );
  }

  roundRobinSort(arr: SongWithUserData[]): SongWithUserData[] {
    const allSongs = arr;
    let sortedArr: SongWithUserData[] = [];
    while (allSongs.length > 0) {
      const orderedSet: SongWithUserData[] = [];
      for (let i = 0; i < allSongs.length; i += 1) {
        const found = orderedSet.find(element => element.accessToken === allSongs[i].accessToken);
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
}
