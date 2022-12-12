import { AxiosResponse } from 'axios';
import { isWithinInterval, subHours } from 'date-fns';
import { Playlist } from '../../shared/db/models/Playlist';
import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
import { QueueService } from '../../shared/services/queue.service';
import { UserService } from '../user/user.service';
import { SpotifyHttpService } from './spotify-http.service';
import { SpotifyPlaylist, SpotifyPlaylistItemInfo, SpotifyResponse, SpotifyUserData } from './spotify-http.interface';
import { PlaylistData, SongsByUser, SongWithUserData } from './spotify.interface';

export class SpotifyService {
  userService = new UserService();
  queueService = QueueService.getInstance();
  httpService = new SpotifyHttpService();

  getUserData(accessToken: string): Promise<SpotifyUserData> {
    return this.httpService.getUserData(accessToken);
  }

  async getUserPlaylists(accessToken: string): Promise<PlaylistData> {
    const user: User | undefined = await this.userService.getUserWithRelations({
      where: { accessToken },
      relations: ['memberPlaylists', 'ownedPlaylists'],
    });
    return this.httpService
      .getUserPlaylists(accessToken)
      .then(
        (resp: AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>): PlaylistData => {
          if (resp) {
            const spotifyPlaylists: SpotifyPlaylist[] = resp.data.items;
            if (user) {
              const createdPlaylists = user?.ownedPlaylists?.map(x => x.playlistId) || [];
              const memberPlaylists =
                user?.memberPlaylists?.map(x => x.playlistId)?.filter(x => !createdPlaylists?.includes(x)) || [];

              const orphanPlaylists = createdPlaylists.filter(x => !spotifyPlaylists.find(y => x === y.id));
              const ownedPlaylists = spotifyPlaylists.filter(x => createdPlaylists?.includes(x.id));
              const subscribedPlaylists = spotifyPlaylists.filter(x => memberPlaylists?.includes(x.id));

              return {
                ownedPlaylists,
                orphanPlaylists,
                subscribedPlaylists,
                refreshToken: resp?.data?.refreshToken,
                accessToken: resp?.data?.accessToken,
              };
            }
            return { ownedPlaylists: [], orphanPlaylists: [], subscribedPlaylists: [] };
          }
          return { ownedPlaylists: [], orphanPlaylists: [], subscribedPlaylists: [] };
        },
      )
      .catch(e => {
        throw e;
      });
  }

  async createUserPlaylist(accessToken: string): Promise<void> {
    const user = await this.userService.getUser({ accessToken: accessToken.split(' ')[1] });
    if (user) {
      const createdPlaylist = await this.httpService.createUserPlaylist(accessToken, user);
      const savedPlaylist = await this.userService.savePlaylist(user, createdPlaylist.data.id);
      return this.refreshPlaylist(savedPlaylist.playlistId);
    } else {
      throw new Error('Unable to find user');
    }
  }

  async removePlaylist(accessToken: string, playlists: string[]): Promise<Playlist[]> {
    const ownedPlaylists = await this.userService.getAllOwnedPlaylists(accessToken);
    const playlistsOwnedAndToBeDeleted: Playlist[] = ownedPlaylists.filter(x =>
      playlists.some(y => x.playlistId === y),
    );
    if (playlistsOwnedAndToBeDeleted.length) {
      return this.userService.deletePlaylist(playlistsOwnedAndToBeDeleted);
    }
    throw new Error(`Unable to find playlist with id ${playlists}`);
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
    if (user && playlist) {
      const userWithPlaylist = user;
      const isUserAlreadyMember = userWithPlaylist.memberPlaylists?.map(x => x.playlistId).includes(playlistId);
      if (isUserAlreadyMember) {
        return undefined;
      } else {
        return this.httpService
          .subscribeToPlaylist(accessToken, playlistId)
          .then(_ => this.userService.updatePlaylistMembers(user, playlist));
      }
    }
    throw new Error(`Unable to find user by accessToken: ${accessToken} or playlistId: ${playlistId}`);
  }

  async getTopSongs(members: User[], history: string[]): Promise<SongsByUser[]> {
    const historyIds = history;
    const maxSongsPerArtistPerUser = 3;
    return members?.length
      ? await Promise.all(
          members.map(async (member: User) =>
            this.httpService.getTopSongsByUser(member).then(x => {
              const seenArtists: Record<string, number> = {};

              x.topSongs = x.topSongs.filter(song => {
                let shouldSongBeIgnored = false;
                // This ensures that we only allow a given maxSongsPerArtistPerUser so that we do not get entire albums from one person.
                song.artists.forEach(artist => {
                  seenArtists[artist.id] = seenArtists[artist.id] ? ++seenArtists[artist.id] : 1;
                  if (seenArtists[artist.id] > maxSongsPerArtistPerUser) {
                    shouldSongBeIgnored = true;
                  }
                });
                return !historyIds.includes(song.uri) && !shouldSongBeIgnored;
              });

              x.topSongs.forEach(song => {
                historyIds.push(song.uri);
              });

              return x;
            }),
          ),
        )
      : [];
  }

  filterByHours(arr: Record<string, any>[], fieldName: string, numberOfHours: number): Record<string, any>[] {
    return arr.filter(
      x => !isWithinInterval(x[fieldName], { start: subHours(new Date(), numberOfHours), end: new Date() }),
    );
  }

  // may need advanced filtering here to filter out songs per user.
  getLikedSongsIfNecessary(
    songsByUser: SongsByUser[],
    songsPerUser: number,
    history: string[],
  ): Promise<SongsByUser>[] {
    const historyIds = history;
    return songsByUser.map(async (x: SongsByUser) => {
      if (x.topSongs.length < songsPerUser && x.likedSongs.length < songsPerUser) {
        x.topSongs.forEach(song => historyIds.push(song.uri));
        const newSongsByUser: SongsByUser = Object.assign({}, x);
        return this.httpService.getLikedSongsByUser(x.user).then(y => {
          newSongsByUser.likedSongs = y?.likedSongs?.filter(x => !historyIds.includes(x.uri)) || [];
          newSongsByUser.likedSongs.forEach(song => historyIds.push(song.uri));
          return newSongsByUser;
        });
      }
      return x;
    });
  }

  generatePlaylist(music: SongsByUser[], songsPerUser: number): SongWithUserData[] {
    let playlistSongs: SongWithUserData[] = [];
    music.forEach((songsByUser: SongsByUser) => {
      const { topSongs, likedSongs } = songsByUser;
      console.log('user: ', songsByUser.user.spotifyId, 'top songs: ', topSongs.length);
      console.log('user: ', songsByUser.user.spotifyId, 'liked songs: ', likedSongs.length);
      const lastIndex = songsPerUser - topSongs.length;
      playlistSongs = playlistSongs.concat(topSongs.slice(0, songsPerUser)).concat(likedSongs.slice(0, lastIndex));
    });

    console.log('playlistSongs', playlistSongs.length);

    return playlistSongs;
  }

  async getAllMusic(members: User[], songsPerUser: number, history: Song[]): Promise<SongWithUserData[]> {
    const historyIds: string[] = this.filterByHours(history, 'createdAt', 144).map(x => x.spotifyUrl);

    let music: SongsByUser[] = await this.getTopSongs(members, historyIds);
    music = await Promise.all(this.getLikedSongsIfNecessary(music, songsPerUser, historyIds));

    return this.generatePlaylist(music, songsPerUser);
  }

  async refreshPlaylist(playlistId: string): Promise<void> {
    const identifier = `playlist-${playlistId}`;
    const queue = await this.queueService.queue<Playlist | undefined>(identifier, () =>
      this.populatePlaylist(playlistId),
    );
    if (queue.length === 1) {
      return this.queueService.dequeue(identifier);
    } else {
      return new Promise((resolve, _reject) => {
        resolve();
      });
    }
  }

  private async populatePlaylist(playlistId: string): Promise<Playlist | undefined> {
    const playlist = await this.userService.getPlaylist(playlistId);
    if (playlist) {
      const { members, history, owner } = playlist;

      const songsPerUser = this.getNumberOfItemsPerUser(members.length);
      const music: SongWithUserData[] = await this.getAllMusic(members, songsPerUser, history);
      const orderedPlaylist: SongWithUserData[] = this.roundRobinSort(music);
      // Get all songs from the playlist.
      const playlistTracks: SpotifyPlaylistItemInfo[] = await this.httpService.getPlaylistTracks(
        playlistId,
        owner.accessToken,
      );
      // Remove all songs from the playlist.
      await this.removeAllPlaylistTracks(playlistId, owner.accessToken, playlistTracks);
      return this.httpService
        .addSongsToPlaylist(owner.accessToken, playlistId, orderedPlaylist)
        .then(_ => this.userService.saveSongs(playlist, orderedPlaylist));
    }
    return undefined;
  }

  removeAllPlaylistTracks(
    playlistId: string,
    accessToken: string,
    playlistTracks: SpotifyPlaylistItemInfo[],
  ): Promise<any> {
    const calls = [];
    if (playlistTracks.length > 100) {
      const numberOfCalls = Math.ceil(playlistTracks.length / 100);
      let lastIndex = 0;
      for (let i = 0; i < numberOfCalls; i++) {
        calls.push(
          this.httpService.removeAllPlaylistTracks(playlistId, accessToken, playlistTracks.slice(lastIndex, 100)),
        );
        lastIndex += 100;
      }
    } else {
      calls.push(this.httpService.removeAllPlaylistTracks(playlistId, accessToken, playlistTracks));
    }
    return Promise.all(calls);
  }

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

  getNumberOfItemsPerUser(numberOfUsers: number): number {
    const minSongsPerUser = 6;
    const maxNumberOfSongs = 48;
    const divided = Math.floor(maxNumberOfSongs / numberOfUsers);
    return divided <= minSongsPerUser ? minSongsPerUser : divided;
  }

  getPlaylistHistory(playlistId: string): Promise<Song[]> {
    return this.userService.getPlaylistHistory(playlistId);
  }
}
