import { AxiosResponse } from 'axios';
import { Playlist } from '../../shared/db/models/Playlist';
import { User } from '../../shared/db/models/User';
import { mockSpotifyHttpService } from '../../shared/mocks/mock-spotify-http.service';
import { mockUserService } from '../../shared/mocks/mock-user.service';
import {
  SpotifyPlaylist,
  SpotifyPlaylistItemInfo,
  SpotifyResponse,
  SpotifyTrack,
  SpotifyUserData,
} from './spotify-http.interface';
import { PlaylistData, SongsByUser, SongWithUserData } from './spotify.interface';
import { SpotifyService } from './spotify.service';
import { Song } from '../../shared/db/models/Song';
import { QueueService } from '../../shared/services/queue.service';

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;

  beforeEach(() => {
    spotifyService = new SpotifyService();
    spotifyService.httpService = mockSpotifyHttpService;
    spotifyService.userService = mockUserService;
    spotifyService.queueService = QueueService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPlaylists()', () => {
    let mockGetUserWithRelations: jest.SpyInstance<Promise<User | undefined>>;
    let mockGetUserPlaylists: jest.SpyInstance<Promise<AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>, any>>>;

    beforeEach(() => {
      mockGetUserWithRelations = jest.spyOn(spotifyService.userService, 'getUserWithRelations');
      mockGetUserPlaylists = jest.spyOn(spotifyService.httpService, 'getUserPlaylists');
    });

    it('should return an empty PlaylistData when there is no user', async () => {
      expect.assertions(1);
      const mockUser = undefined;
      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce({
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

    it('should return an empty PlaylistData when there is no response data', async () => {
      expect.assertions(1);
      const mockUser = undefined;
      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(({
        data: undefined,
      } as unknown) as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [],
        orphanPlaylists: [],
        subscribedPlaylists: [],
      };
      expect(result).toEqual(expected);
    });

    it('should return an empty PlaylistData when there is no response.data.items', async () => {
      expect.assertions(1);
      const mockUser = undefined;
      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce({
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

      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(mockSpotifyResponse);
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

    it('should return a populated ownedPlaylist and subscribedPlaylists when a user has spotify data and is a member of a playlist and an owner of another playlist', async () => {
      expect.assertions(1);
      const mockUser = {
        spotifyId: '123',
        ownedPlaylists: [
          {
            playlistId: '456',
          },
        ] as Playlist[],
        memberPlaylists: [{ playlistId: '789' }] as Playlist[],
      } as User;
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              id: '456',
            },
            {
              id: '789',
            },
          ],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>;

      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(mockSpotifyResponse);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [
          {
            id: '456',
          },
        ] as SpotifyPlaylist[],
        orphanPlaylists: [],
        subscribedPlaylists: [{ id: '789' } as SpotifyPlaylist],
      };
      expect(result).toEqual(expected);
    });

    it('should return a populated ownedPlaylist and subscribedPlaylists when a user has spotify data and is a member of a playlist and an owner of another playlist', async () => {
      expect.assertions(1);
      const mockUser = {
        spotifyId: '123',
        ownedPlaylists: [
          {
            playlistId: '456',
          },
        ] as Playlist[],
        memberPlaylists: [{ playlistId: '789' }] as Playlist[],
      } as User;
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              id: '456',
            },
            {
              id: '789',
            },
          ],
        },
      } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>;

      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(mockSpotifyResponse);
      const result = await spotifyService.getUserPlaylists('123');
      const expected: PlaylistData = {
        ownedPlaylists: [
          {
            id: '456',
          },
        ] as SpotifyPlaylist[],
        orphanPlaylists: [],
        subscribedPlaylists: [{ id: '789' } as SpotifyPlaylist],
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

      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(mockSpotifyResponse);
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

      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockResolvedValueOnce(mockSpotifyResponse);
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
      mockGetUserWithRelations.mockRejectedValueOnce(mockErrorString);
      // mockGetUserPlaylists.mockResolvedValueOnce({
      //   data: {
      //     items: [] as SpotifyPlaylist[],
      //   },
      // } as AxiosResponse<SpotifyResponse<SpotifyPlaylist[]>>);
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
      mockGetUserWithRelations.mockResolvedValueOnce(mockUser);
      mockGetUserPlaylists.mockRejectedValueOnce(mockErrorString);
      try {
        await spotifyService.getUserPlaylists('123');
      } catch (e) {
        expect(e).toBe(mockErrorString);
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

    it('should throw an error when a user does not own any playlists but tries to delete playlists', async () => {
      getOwnedPlaylistsMock.mockResolvedValueOnce([]);
      deletePlaylistMock.mockResolvedValueOnce([]);
      expect.assertions(3);
      try {
        await spotifyService.removePlaylist('123', ['3', '4', '5']);
      } catch (e) {
        expect(e).toBeDefined();
        expect(spotifyService.userService.getAllOwnedPlaylists).toHaveBeenCalledTimes(1);
        expect(spotifyService.userService.deletePlaylist).not.toHaveBeenCalled();
      }
    });

    it('should throw an error when a user owns playlists but tries to delete playlists they do not own', async () => {
      getOwnedPlaylistsMock.mockResolvedValueOnce([{ playlistId: '1' }, { playlistId: '2' }] as Playlist[]);
      deletePlaylistMock.mockResolvedValueOnce([]);
      expect.assertions(3);
      try {
        await spotifyService.removePlaylist('123', ['3', '4', '5']);
      } catch (e) {
        expect(e).toBeDefined();
        expect(spotifyService.userService.getAllOwnedPlaylists).toHaveBeenCalledTimes(1);
        expect(spotifyService.userService.deletePlaylist).not.toHaveBeenCalledWith();
      }
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
      getUserMock.mockResolvedValueOnce({
        id: '1',
        memberPlaylists: [{ playlistId: '1' }],
      } as User);
      getPlaylistMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      const result = await spotifyService.subscribeToPlaylist('123', '1');
      expect(result).toBe(undefined);
    });

    it('should call httpService.subscribeToPlaylist if a user and playlist exist and the user is not already a member of the playlist', async () => {
      getUserMock.mockResolvedValueOnce({
        id: '1',
        memberPlaylists: [{ playlistId: '2' }],
      } as User);
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

    it('should call httpService.subscribeToPlaylist if a user and playlist exist and the user is not already a member of the playlist because they do not have any memberPlaylists', async () => {
      getUserMock.mockResolvedValueOnce({
        id: '1',
        memberPlaylists: undefined,
      } as User);
      getPlaylistMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      subscribeToPlaylistMock.mockResolvedValueOnce({} as AxiosResponse<any, any>);
      updatePlaylistMembersMock.mockResolvedValueOnce({ playlistId: '1' } as Playlist);
      const result = await spotifyService.subscribeToPlaylist('123', '1');
      expect(subscribeToPlaylistMock).toHaveBeenCalledWith('123', '1');
      expect(updatePlaylistMembersMock).toHaveBeenCalledWith({ id: '1' }, { playlistId: '1' });
      expect(result).toEqual({ playlistId: '1' });
    });
  });

  describe('removeAllPlaylistTracks()', () => {
    it('should call httpService.removeAllPlaylistTracks one time if under 100 tracks', async () => {
      const mockTracksUnder100: SpotifyPlaylistItemInfo[] = Array.from({ length: 99 }, (_, _x) => ({
        // eslint-disable-next-line @typescript-eslint/camelcase
        is_local: false,
      })) as SpotifyPlaylistItemInfo[];
      await spotifyService.removeAllPlaylistTracks('123', '1', mockTracksUnder100);
      expect(spotifyService.httpService.removeAllPlaylistTracks).toHaveBeenCalledTimes(1);
    });

    it('should call httpService.removeAllPlaylistTracks multiple times if over 100 tracks', async () => {
      const mockTracksOver100: SpotifyPlaylistItemInfo[] = Array.from({ length: 101 }, (_, _x) => ({
        // eslint-disable-next-line @typescript-eslint/camelcase
        is_local: false,
      })) as SpotifyPlaylistItemInfo[];
      await spotifyService.removeAllPlaylistTracks('123', '1', mockTracksOver100);
      expect(spotifyService.httpService.removeAllPlaylistTracks).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshPlaylist()', () => {
    it('should add to the queue and immediately dequeue', async () => {
      jest.spyOn(spotifyService, 'populatePlaylist').mockResolvedValueOnce(undefined);
      const queueSpy = jest.spyOn(spotifyService.queueService, 'queue');
      const dequeueSpy = jest.spyOn(spotifyService.queueService, 'dequeue');
      await spotifyService.refreshPlaylist('123', false);
      expect(queueSpy).toHaveBeenCalledTimes(1);
      expect(dequeueSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserData()', () => {
    let mockGetUserData: jest.SpyInstance<Promise<SpotifyUserData>>;

    beforeEach(() => {
      mockGetUserData = jest.spyOn(spotifyService.httpService, 'getUserData');
    });

    it('should return user data when user data is returned', async () => {
      expect.assertions(1);
      const mockUser = { email: 'abc@123.com' } as SpotifyUserData;
      mockGetUserData.mockResolvedValueOnce(mockUser);
      const userData = await spotifyService.getUserData('123');
      expect(userData).toBe(mockUser);
    });

    it('should throw an error when an error is thrown', async () => {
      expect.assertions(1);
      const mockError = new Error('Test');
      mockGetUserData.mockRejectedValueOnce(mockError);
      await spotifyService.getUserData('123').catch(e => {
        expect(e).toBe(mockError);
      });
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

    it('should call httpService and userService if a user exists', async () => {
      getUserMock.mockResolvedValueOnce({ id: '123' } as User);
      createUserPlaylistMock.mockResolvedValueOnce({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValueOnce({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValueOnce();
      await spotifyService.createUserPlaylist('Bearer 123');
      expect(getUserMock).toHaveBeenCalledTimes(1);
      expect(createUserPlaylistMock).toHaveBeenCalledTimes(1);
      expect(savePlaylistMock).toHaveBeenCalledTimes(1);
      expect(refreshPlaylistMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if userService throws an error', async () => {
      getUserMock.mockRejectedValueOnce('Test error');
      createUserPlaylistMock.mockResolvedValueOnce({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValueOnce({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValueOnce();
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
      getUserMock.mockResolvedValueOnce({ id: '123' } as User);
      createUserPlaylistMock.mockRejectedValueOnce('Test error');
      savePlaylistMock.mockResolvedValueOnce({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValueOnce();
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
      getUserMock.mockResolvedValueOnce(null);
      createUserPlaylistMock.mockResolvedValueOnce({ data: { id: '123' } });
      savePlaylistMock.mockResolvedValueOnce({ id: '123' } as Playlist);
      refreshPlaylistMock.mockResolvedValueOnce();
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

  describe('filterSongsNotInUSA', () => {
    it('should return only songs that are available in the US', () => {
      const songs = [
        {
          // eslint-disable-next-line @typescript-eslint/camelcase
          available_markets: ['US'],
        },
        {
          // eslint-disable-next-line @typescript-eslint/camelcase
          available_markets: ['CA'],
        },
        {
          // eslint-disable-next-line @typescript-eslint/camelcase
          available_markets: ['US'],
        },
      ] as SongWithUserData[];
      const result = spotifyService.filterSongsNotInUSA(songs);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(songs[0]);
      expect(result[1]).toEqual(songs[2]);
    });
  });

  describe('filterMaxNumberOfSongsPerUserPerArists', () => {
    it('should return only songs which are not repeated more than the max number of times per artist', () => {
      const songs = [
        {
          artists: [{ id: '1' }, { id: '2' }],
        },
        {
          artists: [{ id: '1' }, { id: '2' }],
        },
        {
          artists: [{ id: '1' }, { id: '3' }],
        },
      ] as SongWithUserData[];
      const result = spotifyService.filterMaxNumberOfSongsPerUserPerArists(songs, 2);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(songs[0]);
      expect(result[1]).toEqual(songs[1]);
    });
  });

  describe('getTopSongs()', () => {
    let getTopSongsByUserMock: jest.SpyInstance<Promise<SpotifyResponse<SpotifyTrack[]>>>;
    beforeEach(() => {
      getTopSongsByUserMock = jest.spyOn(spotifyService.httpService, 'getTopSongsByUser');
    });

    it('should return an empty array if members is undefined', async () => {
      const result = await spotifyService.getTopSongs((undefined as unknown) as User[], []);
      expect(result).toEqual([]);
      expect(getTopSongsByUserMock).toHaveBeenCalledTimes(0);
    });

    it('should return an empty array if no users are passed in', async () => {
      const result = await spotifyService.getTopSongs([], []);
      expect(result).toEqual([]);
      expect(getTopSongsByUserMock).toHaveBeenCalledTimes(0);
    });

    it('should call httpService.getTopSongsByUser as many times as members.length and only return songs that are not included in history', async () => {
      getTopSongsByUserMock.mockResolvedValueOnce({
        items: [
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '1',
            artists: [{ id: 'abc' }, { id: 'def' }],
          },
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '2',
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
        ],
      } as SpotifyResponse<SpotifyTrack[]>);
      getTopSongsByUserMock.mockResolvedValueOnce({
        items: [
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '1',
            artists: [{ id: 'abc' }, { id: 'def' }],
          },
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '2',
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
        ],
      } as SpotifyResponse<SpotifyTrack[]>);
      getTopSongsByUserMock.mockResolvedValueOnce({
        items: [
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '1',
            artists: [{ id: 'abc' }, { id: 'def' }],
          },
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            uri: '2',
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
        ],
      } as SpotifyResponse<SpotifyTrack[]>);
      const mockHistory = ['1'];
      const memberArr = [{ spotifyId: '1' }, { spotifyId: '2' }, { spotifyId: '3' }] as User[];
      const result = await spotifyService.getTopSongs(memberArr, mockHistory);
      const expected = [
        {
          user: {
            spotifyId: '1',
          },
          topSongs: [
            {
              // eslint-disable-next-line @typescript-eslint/camelcase
              available_markets: ['US'],
              uri: '2',
              artists: [{ id: 'ghi' }, { id: 'jkl' }],
              spotifyId: '1',
            },
          ],
          likedSongs: [],
        },
        {
          user: {
            spotifyId: '2',
          },
          topSongs: [
            {
              // eslint-disable-next-line @typescript-eslint/camelcase
              available_markets: ['US'],
              uri: '2',
              artists: [{ id: 'ghi' }, { id: 'jkl' }],
              spotifyId: '2',
            },
          ],
          likedSongs: [],
        },
        {
          user: {
            spotifyId: '3',
          },
          topSongs: [
            {
              // eslint-disable-next-line @typescript-eslint/camelcase
              available_markets: ['US'],
              uri: '2',
              artists: [{ id: 'ghi' }, { id: 'jkl' }],
              spotifyId: '3',
            },
          ],
          likedSongs: [],
        },
      ];
      expect(result).toEqual(expected);
      expect(getTopSongsByUserMock).toHaveBeenCalledTimes(memberArr.length);
    });

    it('should return an empty topSongs and likedSongs when an error is thrown by httpService.getSTopSongs', async () => {
      getTopSongsByUserMock.mockRejectedValueOnce('Test');
      const result = await spotifyService.getTopSongs([{ id: '1' } as User], []);
      const expected = [
        {
          user: {
            id: '1',
          },
          topSongs: [],
          likedSongs: [],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('getLikedSongsIfNecessary()', () => {
    let mockGetLikedSongsByUser: jest.SpyInstance<Promise<SpotifyResponse<SpotifyTrack[]>>>;
    beforeEach(() => {
      mockGetLikedSongsByUser = jest.spyOn(spotifyService.httpService, 'getLikedSongsByUser');
    });

    it('should return an empty array for likedSongs if there are enough topSongs', async () => {
      const mockSongsByUser = {
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
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;
      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 2, []);
      expect(result.likedSongs).toEqual([]);
    });

    it('should return likedSongs when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        items: [
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
          {
            uri: '4',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
          },
        ],
        next: 'fake-url',
      } as SpotifyResponse<SpotifyTrack[]>);
      const mockSongsByUser = {
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
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;

      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, []);
      expect(result.likedSongs?.length).toBe(2);
    });

    it('should return only likedSongs that are not listed in history when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        items: [
          {
            uri: '1',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
          },
        ],
        next: 'fake-url',
      } as SpotifyResponse<SpotifyTrack[]>);
      const mockSongsByUser = {
        user: {
          spotifyId: '1',
        },
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;
      const expected = {
        ...mockSongsByUser,
        likedSongs: [
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
            spotifyId: '1',
          },
        ],
      };
      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, ['1', '2']);
      expect(result).toEqual(expected);
    });

    it('should return only likedSongs that are not listed in history when there are not enough top songs', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        items: [
          {
            uri: '1',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
          },
          {
            uri: '5',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '789' }, { id: '000' }],
          },
          {
            uri: '7',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '111' }, { id: '222' }],
          },
        ],
      } as SpotifyResponse<SpotifyTrack[]>);
      const mockSongsByUser = {
        user: {
          spotifyId: '1',
        } as User,
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;
      const expected = {
        ...mockSongsByUser,
        likedSongs: [
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
            spotifyId: '1',
          },
          {
            uri: '5',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '789' }, { id: '000' }],
            spotifyId: '1',
          },
        ],
      };
      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, ['1', '2', '7']);
      expect(result).toEqual(expected);
    });

    it('should return only likedSongs that are not listed in history when there are not enough top songs, and it should call getLIkedSongsIfNecessary twice if more songs are required and next is present', async () => {
      mockGetLikedSongsByUser.mockResolvedValueOnce({
        items: [
          {
            uri: '1',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: 'ghi' }, { id: 'jkl' }],
          },
        ],
        next: 'fake-url',
      } as SpotifyResponse<SpotifyTrack[]>);

      mockGetLikedSongsByUser.mockResolvedValueOnce({
        items: [
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
          },
          {
            uri: '5',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '789' }, { id: '000' }],
          },
          {
            uri: '7',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '111' }, { id: '222' }],
          },
        ],
      } as SpotifyResponse<SpotifyTrack[]>);
      const mockSongsByUser = {
        user: {
          spotifyId: '1',
        } as User,
        topSongs: [
          {
            uri: '1',
          },
          {
            uri: '2',
          },
        ],
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;
      const expected = {
        ...mockSongsByUser,
        likedSongs: [
          {
            uri: '3',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '123' }, { id: '456' }],
            spotifyId: '1',
          },
          {
            uri: '5',
            // eslint-disable-next-line @typescript-eslint/camelcase
            available_markets: ['US'],
            artists: [{ id: '789' }, { id: '000' }],
            spotifyId: '1',
          },
        ],
      };
      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 4, ['1', '2', '7']);
      expect(mockGetLikedSongsByUser).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expected);
    });

    it('should return the newSongsByUser if an error is received on call to get liked songs', async () => {
      mockGetLikedSongsByUser.mockRejectedValueOnce('test');
      const mockSongsByUser = {
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
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser;
      const result = await spotifyService.getLikedSongsIfNecessary(mockSongsByUser, 3, []);
      expect(mockGetLikedSongsByUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSongsByUser);
    });
  });

  describe('getAllMusic()', () => {
    let mockGetTopSongs: jest.SpyInstance<Promise<SongsByUser[]>>;
    let mockGetLikedSongsIfNecessary: jest.SpyInstance<Promise<SongsByUser>>;

    beforeEach(() => {
      mockGetTopSongs = jest.spyOn(spotifyService, 'getTopSongs');
      mockGetLikedSongsIfNecessary = jest.spyOn(spotifyService, 'getLikedSongsIfNecessary');
    });

    it('should handle an empty topSongs and liked songs arrays', async () => {
      const generatePlaylistSpy = jest.spyOn(spotifyService, 'generatePlaylist');
      mockGetTopSongs.mockResolvedValueOnce([]);
      mockGetLikedSongsIfNecessary.mockResolvedValueOnce({} as SongsByUser);
      const members = [] as User[];
      const songsPerUser = 6;
      const history = [] as Song[];
      await spotifyService.getAllMusic(members, songsPerUser, history);
      expect(generatePlaylistSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle list of members and history', async () => {
      const generatePlaylistSpy = jest.spyOn(spotifyService, 'generatePlaylist');
      mockGetTopSongs.mockResolvedValueOnce([
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
          likedSongs: [] as SongWithUserData[],
        },
      ] as SongsByUser[]);
      mockGetLikedSongsIfNecessary.mockResolvedValueOnce({
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
        likedSongs: [] as SongWithUserData[],
      } as SongsByUser);
      const members = [
        {
          id: '1',
        } as User,
      ] as User[];
      const songsPerUser = 6;
      const history = [
        {
          spotifyUrl: '1',
        },
        {
          spotifyUrl: '2',
        },
      ] as Song[];
      await spotifyService.getAllMusic(members, songsPerUser, history);
      expect(generatePlaylistSpy).toHaveBeenCalledTimes(1);
      expect(mockGetTopSongs).toHaveBeenCalledTimes(1);
      expect(mockGetLikedSongsIfNecessary).toHaveBeenCalledTimes(1);
    });
  });

  describe('generatePlaylist()', () => {
    it('should populate the playlist with only top songs if the user has enough top songs', () => {
      const expected = [
        {
          uri: '1',
        },
        {
          uri: '2',
        },
        {
          uri: '3',
        },
      ] as SongWithUserData[];
      const mockSongs = [
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
            {
              uri: '3',
            },
          ],
          likedSongs: [] as SongWithUserData[],
        },
      ] as SongsByUser[];
      const result = spotifyService.generatePlaylist(mockSongs, 3);
      expect(result).toEqual(expected);
    });

    it('should populate the playlist with top songs and liked songs if there are not enough top songs', () => {
      const expected = [
        {
          uri: '1',
        },
        {
          uri: '2',
        },
        {
          uri: '3',
        },
      ] as SongWithUserData[];
      const mockSongs = [
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
          likedSongs: [
            {
              uri: '3',
            },
          ],
        },
      ] as SongsByUser[];
      expect(spotifyService.generatePlaylist(mockSongs, 3)).toEqual(expected);
    });

    it('should populate the playlist with only liked songs if there are no top songs', () => {
      const mockSongs = [
        {
          user: {
            id: '1',
          },
          topSongs: [] as SongWithUserData[],
          likedSongs: [
            {
              uri: '1',
            },
            {
              uri: '2',
            },
            {
              uri: '3',
            },
          ],
        },
      ] as SongsByUser[];
      const expected = [
        {
          uri: '1',
        },
        {
          uri: '2',
        },
        {
          uri: '3',
        },
      ] as SongWithUserData[];

      const result = spotifyService.generatePlaylist(mockSongs, 3);
      expect(result).toEqual(expected);
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

  describe('getNumberOfItemsPerUser()', () => {
    it('should return maxNumberofSongs when there is only 1 user', () => {
      expect(spotifyService.getNumberOfItemsPerUser(1)).toBe(30);
    });

    it('should calculate a number of songs when there is 5 users', () => {
      expect(spotifyService.getNumberOfItemsPerUser(5)).toBe(6);
    });

    it('should calculate a number of songs when there is 7 users', () => {
      expect(spotifyService.getNumberOfItemsPerUser(7)).toBe(4);
    });
  });
});
