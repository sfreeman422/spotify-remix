import { AxiosResponse } from 'axios';
import { Playlist } from '../../shared/db/models/Playlist';
import { User } from '../../shared/db/models/User';
import { mockQueueService } from '../../shared/mocks/mock-queue.service';
import { mockSpotifyHttpService } from '../../shared/mocks/mock-spotify-http.service';
import { mockUserService } from '../../shared/mocks/mock-user.service';
import { SpotifyPlaylist, SpotifyResponse, SpotifyUserData } from './spotify.generated.interface';
import { PlaylistData, SongWithUserData } from './spotify.interface';
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

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue([mockUser]);
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

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue([mockUser]);
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

      jest.spyOn(spotifyService.userService, 'getUserWithRelations').mockResolvedValue([mockUser]);
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
