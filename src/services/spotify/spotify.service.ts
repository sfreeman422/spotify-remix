import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
import { QueueService } from '../../shared/services/queue.service';
import { UserService } from '../user/user.service';
import { SpotifyHttpService } from './spotify-http.service';
import {
  SpotifyPlaylist,
  SpotifyPlaylistItemInfo,
  SpotifyResponse,
  SpotifyTrack,
  SpotifyUserData,
} from './spotify-http.interface';
import { PlaylistData, SongsByUser, SongWithUserData } from './spotify.interface';
import { WebAPICallResult } from '@slack/web-api';
import { SlackService } from '../slack/slack.service';
import { AxiosResponse } from 'axios';
import { Playlist } from '../../shared/db/models/Playlist';

export class SpotifyService {
  userService = new UserService();
  queueService = QueueService.getInstance();
  httpService = new SpotifyHttpService();
  slackService = new SlackService();

  MAX_SONGS_PER_ARTIST_PER_USER = 3;

  async getUserPlaylists(accessToken: string): Promise<PlaylistData> {
    const user: User | undefined = await this.userService.getUserWithRelations({
      where: { accessToken },
      relations: ['memberPlaylists', 'ownedPlaylists'],
    });
    return this.httpService
      .getUserPlaylists(accessToken)
      .then(
        (resp: AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>): PlaylistData => {
          if (!resp.data?.items?.length || !user) {
            return {
              ownedPlaylists: [],
              orphanPlaylists: [],
              subscribedPlaylists: [],
            };
          } else {
            const createdPlaylists: string[] = user?.ownedPlaylists?.map(x => x.playlistId) || [];
            const memberPlaylists: string[] =
              user?.memberPlaylists?.map(x => x.playlistId)?.filter(x => !createdPlaylists?.includes(x)) || [];

            const orphanPlaylists: string[] = createdPlaylists.filter(x => !resp.data.items.find(y => x === y.id));
            const ownedPlaylists: SpotifyPlaylist[] = resp.data.items.filter(x => createdPlaylists?.includes(x.id));
            const subscribedPlaylists: SpotifyPlaylist[] = resp.data.items.filter(x => memberPlaylists?.includes(x.id));

            return {
              ownedPlaylists,
              orphanPlaylists,
              subscribedPlaylists,
              refreshToken: resp?.data?.refreshToken,
              accessToken: resp?.data?.accessToken,
            };
          }
        },
      )
      .catch(e => {
        throw e;
      });
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

  async subscribeToPlaylist(accessToken: string, playlistId: string): Promise<Playlist | undefined> {
    const user = await this.userService.getUserWithRelations({
      where: { accessToken },
      relations: ['memberPlaylists', 'ownedPlaylists'],
    });

    const playlist = await this.userService.getPlaylist(playlistId);
    if (user && playlist) {
      const userWithPlaylist = user;
      const isUserAlreadyMember = !!userWithPlaylist.memberPlaylists?.some(x => x.playlistId === playlistId);
      if (isUserAlreadyMember) {
        return undefined;
      } else {
        return this.httpService
          .subscribeToPlaylist(accessToken, playlistId)
          .then(() => this.userService.updatePlaylistMembers(user, playlist));
      }
    }
    throw new Error(`Unable to find user by accessToken: ${accessToken} or playlistId: ${playlistId}`);
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

  refreshPlaylist(playlistId: string, isNewPlaylist = false): Promise<void> {
    const identifier = `playlist-${playlistId}`;
    this.queueService.queue<WebAPICallResult | undefined>(identifier, () =>
      this.populatePlaylist(playlistId, isNewPlaylist),
    );

    return this.queueService.dequeue(identifier);
  }

  getUserData(accessToken: string): Promise<SpotifyUserData> {
    return this.httpService.getUserData(accessToken);
  }

  async createUserPlaylist(accessToken: string): Promise<void> {
    const user = await this.userService.getUser({ accessToken: accessToken.split(' ')[1] });
    if (user) {
      const createdPlaylist = await this.httpService.createUserPlaylist(accessToken, user);
      const savedPlaylist = await this.userService.savePlaylist(user, createdPlaylist.data.id);
      return this.refreshPlaylist(savedPlaylist.playlistId, true);
    } else {
      throw new Error('Unable to find user');
    }
  }

  filterSongsNotInUSA(songs: SpotifyTrack[]): SpotifyTrack[] {
    return songs.filter(song => song.available_markets.includes('US'));
  }

  filterMaxNumberOfSongsPerUserPerArists(songs: SpotifyTrack[], maxSongsPerArtistPerUser: number): SpotifyTrack[] {
    const seenArtists: Record<string, number> = {};

    return songs.filter(song => {
      let shouldSongBeIgnored = false;
      song.artists.forEach(artist => {
        seenArtists[artist.id] = seenArtists[artist.id] ? seenArtists[artist.id] + 1 : 1;
        if (seenArtists[artist.id] > maxSongsPerArtistPerUser) {
          shouldSongBeIgnored = true;
        }
      });

      return !shouldSongBeIgnored;
    });
  }

  filterSongsPerUser(songs: SpotifyTrack[], history: string[], maxNumberOfSongsPerArtistUser: number): SpotifyTrack[] {
    const filteredByHistory = songs.filter(x => !history.includes(x.uri));
    const filteredByUsa = this.filterSongsNotInUSA(filteredByHistory);
    return this.filterMaxNumberOfSongsPerUserPerArists(filteredByUsa, maxNumberOfSongsPerArtistUser);
  }

  async getTopSongs(members: User[], history: string[]): Promise<SongsByUser[]> {
    return members?.length
      ? await Promise.all(
          members.map(
            async (member: User): Promise<SongsByUser> => {
              const topSongs: SongWithUserData[] = await this.httpService
                .getTopSongsByUser(member)
                .then(resp => {
                  const filteredSongs = this.filterSongsPerUser(
                    resp.items,
                    history,
                    this.MAX_SONGS_PER_ARTIST_PER_USER,
                  );
                  return filteredSongs.map(song => ({ ...song, spotifyId: member.spotifyId }));
                })
                .catch(e => {
                  console.error(e);
                  console.error(`Unable to getTopSongs for ${member.spotifyId}`);
                  // Enables the playlist to not break if one user is not able to get songs
                  return [];
                });

              const songsByUser: SongsByUser = {
                user: member,
                topSongs,
                likedSongs: [],
              };

              return songsByUser;
            },
          ),
        )
      : [];
  }

  getLikedSongsIfNecessary(
    songsByUser: SongsByUser,
    songsPerUser: number,
    history: string[],
    url?: string,
  ): Promise<SongsByUser> {
    const needsMoreSongs = songsByUser.topSongs.length + songsByUser.likedSongs.length < songsPerUser;
    if (needsMoreSongs) {
      const newSongsByUser: SongsByUser = Object.assign({}, songsByUser);
      return this.httpService
        .getLikedSongsByUser(songsByUser.user, url)
        .then(resp => {
          const filteredSongs = this.filterSongsPerUser(resp.items, history, this.MAX_SONGS_PER_ARTIST_PER_USER);
          return {
            filteredSongs: filteredSongs.map(song => ({ ...song, spotifyId: songsByUser.user.spotifyId })),
            next: resp.next,
          };
        })
        .then(songsWithNext => {
          newSongsByUser.likedSongs = newSongsByUser.likedSongs.concat(songsWithNext.filteredSongs);
          if (newSongsByUser.likedSongs.length + newSongsByUser.topSongs.length < songsPerUser && songsWithNext.next) {
            return this.getLikedSongsIfNecessary(newSongsByUser, songsPerUser, history, songsWithNext.next);
          }
          return newSongsByUser;
        })
        .catch(e => {
          console.error(`Unable to getLikedSongsIfNecessary for ${songsByUser.user}`);
          console.error(e);
          // This prevents breaking the playlist if a user is unable to get liked songs.
          return Promise.resolve(newSongsByUser);
        });
    }
    return Promise.resolve(songsByUser);
  }

  async getAllMusic(members: User[], songsPerUser: number, history: Song[]): Promise<SongWithUserData[]> {
    const historyIds: string[] = history.map(x => x.spotifyUrl);

    let music: SongsByUser[] = await this.getTopSongs(members, historyIds);
    // Add to temporary history since we do not want to repeat songs.
    music.forEach(x => x.topSongs.forEach(song => historyIds.push(song.uri)));
    music = await Promise.all(music.map(x => this.getLikedSongsIfNecessary(x, songsPerUser, historyIds)));

    return this.generatePlaylist(music, songsPerUser);
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

  async populatePlaylist(playlistId: string, isNewPlaylist: boolean): Promise<WebAPICallResult | undefined> {
    const playlist = await this.userService.getPlaylist(playlistId, isNewPlaylist);
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
        .then(() => this.userService.saveSongs(playlist, orderedPlaylist))
        .then(() => {
          // da bros playlist - this is not scalable, stupid temporary bandaid to support web-hook-like behavior.
          if (playlist.playlistId === '3JCMiFTkDnUGmP6hcTDiQo') {
            const blocks = this.slackService.buildMessage(orderedPlaylist);
            return this.slackService.sendMessage('#music', 'Data about the playlist', blocks);
          }
          return undefined;
        });
    }
    console.log('no playlist found, returning undefined');
    return undefined;
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
    const maxNumberOfSongs = 30;
    return Math.floor(maxNumberOfSongs / numberOfUsers);
  }

  getPlaylistHistory(playlistId: string): Promise<Song[]> {
    return this.userService.getPlaylistHistory(playlistId);
  }
}
