import { AxiosResponse } from 'axios';
import { subHours } from 'date-fns';
import { Playlist } from '../../shared/db/models/Playlist';
import { Song } from '../../shared/db/models/Song';
import { User } from '../../shared/db/models/User';
import { mockQueueService } from '../../shared/mocks/mock-queue.service';
import { mockSpotifyHttpService } from '../../shared/mocks/mock-spotify-http.service';
import { mockUserService } from '../../shared/mocks/mock-user.service';
import { SpotifyPlaylist, SpotifyResponse, SpotifyUserData } from './spotify.generated.interface';
import { PlaylistData, SongsByUser, SongWithUserData } from './spotify.interface';
import { SpotifyService } from './spotify.service';

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;

  beforeEach(() => {
    spotifyService = new SpotifyService();
    spotifyService.httpService = mockSpotifyHttpService;
    spotifyService.userService = mockUserService;
    spotifyService.queueService = mockQueueService;
  });

  describe('getUserData()', () => {
    it('should return user data when user data is returned', async () => {
      expect.assertions(1);
      const mockUser = { email: 'abc@123.com' } as SpotifyUserData;
      jest.spyOn(spotifyService.httpService, 'getUserData').mockResolvedValueOnce(mockUser);
      const userData = await spotifyService.getUserData('123');
      expect(userData).toBe(mockUser);
    });

    it('should throw an error when an error is thrown', async () => {
      expect.assertions(1);
      const mockError = new Error('Test');
      jest.spyOn(spotifyService.httpService, 'getUserData').mockRejectedValueOnce(mockError);
      await spotifyService.getUserData('123').catch(e => {
        expect(e).toBe(mockError);
      });
    });
  });

  describe('getUserPlaylists()', () => {
    it('should return an empty PlaylistData when there is no user', async () => {
      expect.assertions(1);
      const mockUser = undefined;
      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue(mockUser);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockResolvedValue({
        data: {
          items: [] as SpotifyPlaylist[],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [],
        orphanPlaylists: [],
        subscribedPlaylists: [],
      };
      expect(result).toEqual(expected);
    });

    it('should return a populated ownedPlaylist when a user has spotify data and owns a playlist', async () => {
      expect.assertions(1);
      const mockUser = {
        spotifyId: '123',
        ownedPlaylists: [
          {
            playlistId: '456',
          },
        ] as Playlist[],
      } as User;
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              id: '456',
            },
          ],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>;

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue(mockUser);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockResolvedValue(mockSpotifyResponse);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [
          {
            id: '456',
          },
        ] as SpotifyPlaylist[],
        orphanPlaylists: [],
        subscribedPlaylists: [],
      };
      expect(result).toEqual(expected);
    });

    it('should return a populated subscribedPlaylist when a user has spotify data and is subscribed to a playlist', async () => {
      expect.assertions(1);
      const mockUser = {
        spotifyId: '123',
        memberPlaylists: [
          {
            playlistId: '456',
          },
        ] as Playlist[],
      } as User;
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              id: '456',
            },
          ],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>;

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue(mockUser);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockResolvedValue(mockSpotifyResponse);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [],
        orphanPlaylists: [],
        subscribedPlaylists: [
          {
            id: '456',
          },
        ] as SpotifyPlaylist[],
      };
      expect(result).toEqual(expected);
    });

    it('should return a populated orphanPlaylist when a user has spotify data and owns a playlist but that playlist does not appear in the spotify data', async () => {
      expect.assertions(1);
      const mockUser = {
        spotifyId: '123',
        ownedPlaylists: [
          {
            playlistId: '123',
          },
          {
            playlistId: '456',
          },
        ] as Playlist[],
      } as User;
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              id: '456',
            },
          ],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>;

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue(mockUser);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockResolvedValue(mockSpotifyResponse);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [
          {
            id: '456',
          },
        ] as SpotifyPlaylist[],
        orphanPlaylists: ['123'],
        subscribedPlaylists: [],
      };
      expect(result).toEqual(expected);
    });

    it('should throw an error if userService throws an error', async () => {
      expect.assertions(1);
      const mockErrorString = 'Test Error';
      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockRejectedValue(mockErrorString);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockResolvedValue({
        data: {
          items: [] as SpotifyPlaylist[],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>);
      try {
        await spotifyService.getUserPlaylists('123');
      } catch (e) {
        expect(e).toBe(mockErrorString);
      }
    });

    it('should throw an error if httpService throws an error', async () => {
      expect.assertions(1);
      const mockUser = undefined;
      const mockErrorString = 'Test Error';
      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue(mockUser);
      jest.spyOn(spotifyService.httpService, 'getUserPlaylists').mockRejectedValue(mockErrorString);
      try {
        await spotifyService.getUserPlaylists('123');
      } catch (e) {
        expect(e).toBe(mockErrorString);
      }
    });
  });

  describe('createUserPlaylist()', () => {
    let getUserMock: jest.SpyInstance<Promise<User | null>>;
    let createUserPlaylistMock: jest.SpyInstance<Promise<any>>;
    let savePlaylistMock: jest.SpyInstance<Promise<Playlist>>;
    let refreshPlaylistMock: jest.SpyInstance<Promise<void>>;

    beforeEach(() => {
      getUserMock = jest.spyOn(spotifyService.userService, 'getUser');
      createUserPlaylistMock = jest.spyOn(spotifyService.httpService, 'createUserPlaylist');
      savePlaylistMock = jest.spyOn(spotifyService.userService, 'savePlaylist');
      refreshPlaylistMock = jest.spyOn(spotifyService, 'refreshPlaylist');
    });

    afterEach(() => {
      getUserMock.mockClear();
      createUserPlaylistMock.mockClear();
      savePlaylistMock.mockClear();
      refreshPlaylistMock.mockClear();
    });

    it('should call httpService and userService if a user exists', async () => {
      getUserMock.mockResolvedValue({ id: '123' } as User);
      createUserPlaylistMock.mockResolvedValue({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValue({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValue();
      await spotifyService.createUserPlaylist('Bearer 123');
      expect(getUserMock).toHaveBeenCalledTimes(1);
      expect(createUserPlaylistMock).toHaveBeenCalledTimes(1);
      expect(savePlaylistMock).toHaveBeenCalledTimes(1);
      expect(refreshPlaylistMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if userService throws an error', async () => {
      getUserMock.mockRejectedValue('Test error');
      createUserPlaylistMock.mockResolvedValue({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValue({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValue();
      try {
        await spotifyService.createUserPlaylist('Bearer 123');
      } catch (e) {
        expect(e).toBe('Test error');
        expect(getUserMock).toHaveBeenCalledTimes(1);
        expect(createUserPlaylistMock).toHaveBeenCalledTimes(0);
        expect(savePlaylistMock).toHaveBeenCalledTimes(0);
        expect(refreshPlaylistMock).toHaveBeenCalledTimes(0);
      }
    });

    it('should throw an error if httpService throws an error', async () => {
      getUserMock.mockResolvedValue({ id: '123' } as User);
      createUserPlaylistMock.mockRejectedValue('Test error');
      savePlaylistMock.mockResolvedValue({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValue();
      try {
        await spotifyService.createUserPlaylist('Bearer 123');
      } catch (e) {
        expect(e).toBe('Test error');
        expect(getUserMock).toHaveBeenCalledTimes(1);
        expect(createUserPlaylistMock).toHaveBeenCalledTimes(1);
        expect(savePlaylistMock).toHaveBeenCalledTimes(0);
        expect(refreshPlaylistMock).toHaveBeenCalledTimes(0);
      }
    });

    it('should throw an error if a user does not exist', async () => {
      getUserMock.mockResolvedValue(null);
      createUserPlaylistMock.mockResolvedValue({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValue({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValue();
      try {
        await spotifyService.createUserPlaylist('Bearer 123');
      } catch (e) {
        expect((e as Error).message).toBe('Unable to find user');
        expect(getUserMock).toHaveBeenCalledTimes(1);
        expect(createUserPlaylistMock).toHaveBeenCalledTimes(0);
        expect(savePlaylistMock).toHaveBeenCalledTimes(0);
        expect(refreshPlaylistMock).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('removePlaylist()', () => {
    let getOwnedPlaylistsMock: jest.SpyInstance<Promise<Playlist[]>>;
    let deletePlaylistMock: jest.SpyInstance<Promise<Playlist[]>>;

    beforeEach(() => {
      getOwnedPlaylistsMock = jest.spyOn(spotifyService.userService, 'getAllOwnedPlaylists');
      deletePlaylistMock = jest.spyOn(spotifyService.userService, 'deletePlaylist');
    });

    it('should only delete playlists that a given user owns', async () => {
      getOwnedPlaylistsMock.mockResolvedValueOnce([
        {
          playlistId: '1',
        },
        {
          playlistId: '2',
        },
        {
          playlistId: '3',
        },
      ] as Playlist[]);
      deletePlaylistMock.mockResolvedValueOnce([]);
      const result = await spotifyService.removePlaylist('123', ['3', '4', '5']);
      expect(result).toEqual([]);
      expect(spotifyService.userService.getAllOwnedPlaylists).toHaveBeenCalled();
      expect(spotifyService.userService.deletePlaylist).toHaveBeenCalledWith([
        {
          playlistId: '3',
        },
      ]);
    });

    it('should call userService.deletePlaylist with an empty array when a user does not own any playlists but tries to delete playlists', async () => {
      getOwnedPlaylistsMock.mockResolvedValueOnce([]);
      deletePlaylistMock.mockResolvedValueOnce([]);
      const result = await spotifyService.removePlaylist('123', ['3', '4', '5']);
      expect(result).toEqual([]);
      expect(spotifyService.userService.getAllOwnedPlaylists).toHaveBeenCalled();
      expect(spotifyService.userService.deletePlaylist).toHaveBeenCalledWith([]);
    });

    it('should call userService.deletePlaylist with an empty array when a user owns playlists but tries to delete playlists they do not own', async () => {
      getOwnedPlaylistsMock.mockResolvedValueOnce([{ playlistId: '1' }, { playlistId: '2' }] as Playlist[]);
      deletePlaylistMock.mockResolvedValueOnce([]);
      const result = await spotifyService.removePlaylist('123', ['3', '4', '5']);
      expect(result).toEqual([]);
      expect(spotifyService.userService.getAllOwnedPlaylists).toHaveBeenCalled();
      expect(spotifyService.userService.deletePlaylist).toHaveBeenCalledWith([]);
    });
  });

  describe('subscribeToPlaylist()', () => {
    let getUserMock: jest.SpyInstance<Promise<User | undefined>>;
    let getPlaylistMock: jest.SpyInstance<Promise<Playlist | undefined>>;
    let subscribeToPlaylistMock: jest.SpyInstance<Promise<AxiosResponse<any, any>>>;
    let updatePlaylistMembersMock: jest.SpyInstance<Promise<Playlist>>;

    beforeEach(() => {
      getUserMock = jest.spyOn(spotifyService.userService, 'getUserWithRelations');
      getPlaylistMock = jest.spyOn(spotifyService.userService, 'getPlaylist');
      subscribeToPlaylistMock = jest.spyOn(spotifyService.httpService, 'subscribeToPlaylist');
      updatePlaylistMembersMock = jest.spyOn(spotifyService.userService, 'updatePlaylistMembers');
    });

    it('should throw an error if user is undefined', async () => {
      getUserMock.mockResolvedValueOnce(undefined);
      getPlaylistMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      try {
        await spotifyService.subscribeToPlaylist('123', '1');
      } catch (e) {
        expect((e as Error).message).toEqual('Unable to find user by accessToken: 123 or playlistId: 1');
      }
    });

    it('should throw an error if playlist is undefined', async () => {
      getUserMock.mockResolvedValueOnce({ id: '1' } as User);
      getPlaylistMock.mockResolvedValueOnce(undefined);
      try {
        await spotifyService.subscribeToPlaylist('123', '1');
      } catch (e) {
        expect((e as Error).message).toEqual('Unable to find user by accessToken: 123 or playlistId: 1');
      }
    });

    it('should return undefined if the user is already a member of the playlist', async () => {
      getUserMock.mockResolvedValueOnce({ id: '1', memberPlaylists: [{ playlistId: '1' }] } as User);
      getPlaylistMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      const result = await spotifyService.subscribeToPlaylist('123', '1');
      expect(result).toBe(undefined);
    });

    it('should call httpService.subscribeToPlaylist if a user and playlist exist and the user is not already a member of the playlist', async () => {
      getUserMock.mockResolvedValueOnce({ id: '1', memberPlaylists: [{ playlistId: '2' }] } as User);
      getPlaylistMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      subscribeToPlaylistMock.mockResolvedValueOnce({} as AxiosResponse<any, any>);
      updatePlaylistMembersMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      const result = await spotifyService.subscribeToPlaylist('123', '1');
      expect(subscribeToPlaylistMock).toHaveBeenCalledWith('123', '1');
      expect(updatePlaylistMembersMock).toHaveBeenCalledWith(
        { id: '1', memberPlaylists: [{ playlistId: '2' }] },
        { playlistId: '1' },
      );
      expect(result).toEqual({ playlistId: '1' });
    });
  });

  describe('getTopSongs()', () => {
    let getTopSongsByUserMock: jest.SpyInstance<Promise<SongsByUser>>;
    beforeEach(() => {
      getTopSongsByUserMock = jest.spyOn(spotifyService.httpService, 'getTopSongsByUser');
    });

    it('should return an empty array if no users are passed in', async () => {
      const result = await spotifyService.getTopSongs([], []);
      expect(result).toEqual([]);
      expect(getTopSongsByUserMock).toHaveBeenCalledTimes(0);
    });

    it('should call httpService.getTopSongsByUser as many times as members.length and only return songs that are not included in history or included in other users top songs', async () => {
      getTopSongsByUserMock.mockResolvedValueOnce({
        user: { id: '1' },
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
      } as SongsByUser);
      getTopSongsByUserMock.mockResolvedValueOnce({
        user: { id: '2' },
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
      } as SongsByUser);
      getTopSongsByUserMock.mockResolvedValueOnce({
        user: { id: '3' },
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
      } as SongsByUser);
      const mockHistory = ['1'];
      const memberArr = [{ id: '1' }, { id: '2' }, { id: '3' }] as User[];
      const result = await spotifyService.getTopSongs(memberArr, mockHistory);
      const expected = [
        {
          user: {
            id: '1',
          },
          topSongs: [
            {
              uri: '2',
            },
          ],
        },
        {
          user: {
            id: '2',
          },
          topSongs: [],
        },
        {
          user: {
            id: '3',
          },
          topSongs: [],
        },
      ];
      expect(result).toEqual(expected);
      expect(getTopSongsByUserMock).toHaveBeenCalledTimes(memberArr.length);
    });
  });

  describe('filterByHours()', () => {
    it('should return only songs that were created older than one hour ago', () => {
      const passingDate1 = subHours(new Date(), 6);
      const passingDate2 = subHours(new Date(), 3);
      const mockSongs = [
        {
          createdAt: new Date(),
        },
        {
          createdAt: passingDate1,
        },
        {
          createdAt: passingDate2,
        },
        {
          createdAt: new Date(),
        },
        {
          createdAt: new Date(),
        },
      ] as Song[];
      const expected = [
        {
          createdAt: passingDate1,
        },
        {
          createdAt: passingDate2,
        },
      ];
      expect(spotifyService.filterByHours(mockSongs, 'createdAt', 1)).toEqual(expected);
    });
  });

  describe('getLikedSongsIfNecessary()', () => {
    let mockGetLikedSongsByUser: jest.SpyInstance<Promise<SongsByUser>>;
    beforeEach(() => {
      mockGetLikedSongsByUser = jest.spyOn(spotifyService.httpService, 'getLikedSongsByUser');
    });

    it('should return an undefined likedSongs attribute if there are enough topSongs', async () => {
      const mockSongsByUser = [
        {
          user: {
            id: '1',
          },
          topSongs: [
            {
              uri: '1',
            },
            {
              uri: '2',
            },
          ],
        },
      ] as SongsByUser[];
      const result = await Promise.all(spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 2, []));
      expect(result[0].likedSongs).toBeUndefined();
    });

    it('should return likedSongs when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        user: {
          id: '1',
        },
        likedSongs: [
          {
            uri: '3',
          },
          {
            uri: '4',
          },
        ],
      } as SongsByUser);
      const mockSongsByUser = [
        {
          user: {
            id: '1',
          },
          topSongs: [
            {
              uri: '1',
            },
            {
              uri: '2',
            },
          ],
        },
      ] as SongsByUser[];

      const result = await Promise.all(spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, []));
      expect(result[0].likedSongs?.length).toBe(2);
    });

    it('should return only likedSongs that are not also topSongs when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        user: {
          id: '1',
        },
        likedSongs: [
          {
            uri: '1',
          },
          {
            uri: '3',
          },
        ],
      } as SongsByUser);
      const mockSongsByUser = [
        {
          user: {
            id: '1',
          },
          topSongs: [
            {
              uri: '1',
            },
            {
              uri: '2',
            },
          ],
        },
      ] as SongsByUser[];
      const expected = [{ uri: '3' }];
      const result = await Promise.all(spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, []));
      expect(result[0].likedSongs).toEqual(expected);
    });

    it('should return only likedSongs that are not also topSongs, and also not listed in history when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        user: {
          id: '1',
        },
        likedSongs: [
          {
            uri: '1',
          },
          {
            uri: '3',
          },
          {
            uri: '5',
          },
          {
            uri: '7',
          },
        ],
      } as SongsByUser);
      const mockSongsByUser = [
        {
          user: {
            id: '1',
          },
          topSongs: [
            {
              uri: '1',
            },
            {
              uri: '2',
            },
          ],
        },
      ] as SongsByUser[];
      const expected = [{ uri: '3' }, { uri: '5' }];
      const result = await Promise.all(spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, ['7']));
      expect(result[0].likedSongs).toEqual(expected);
    });
  });

  describe('getAllMusic()', () => {
    let mockGetTopSongs: jest.SpyInstance<Promise<SongsByUser[]>>;
    let mockGetLikedSongsByUser: jest.SpyInstance<Promise<SongsByUser>>;

    beforeEach(() => {
      mockGetTopSongs = jest.spyOn(spotifyService, 'getTopSongs');
      mockGetLikedSongsByUser = jest.spyOn(spotifyService.httpService, 'getLikedSongsByUser');
    });

    it('should throw an error if getTopSongs call throws an error', async () => {
      mockGetTopSongs.mockRejectedValueOnce('Test');
      try {
        const members = [] as User[];
        const songsPerUser = 6;
        const history = [] as Song[];
        await spotifyService.getAllMusic(members, songsPerUser, history);
      } catch (e) {
        expect(e).toBe('Test');
      }
    });

    it('should throw an error if getLikedSongsByUser call throws an error', async () => {
      mockGetLikedSongsByUser.mockRejectedValueOnce('Test');
      try {
        const members = [] as User[];
        const songsPerUser = 6;
        const history = [] as Song[];
        await spotifyService.getAllMusic(members, songsPerUser, history);
      } catch (e) {
        expect(e).toBe('Test');
      }
    });
  });

  describe('roundRobinSort()', () => {
    it('should round robin sort', () => {
      const unsorted = [
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '3',
          uri: '3',
        },
        {
          spotifyId: '3',
          uri: '3',
        },
        {
          spotifyId: '2',
          uri: '2',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
      ] as SongWithUserData[];

      const sorted = [
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '3',
          uri: '3',
        },
        {
          spotifyId: '2',
          uri: '2',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '3',
          uri: '3',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
      ];
      expect(spotifyService.roundRobinSort(unsorted)).toStrictEqual(sorted);
    });

    it('should round robin sort when only one access token exists', () => {
      const unsorted = [
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
      ] as SongWithUserData[];

      const sorted = [
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
        {
          spotifyId: '1',
          uri: '1',
        },
      ] as SongWithUserData[];
      expect(spotifyService.roundRobinSort(unsorted)).toStrictEqual(sorted);
    });
  });
});
