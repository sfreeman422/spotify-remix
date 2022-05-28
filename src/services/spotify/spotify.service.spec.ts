import { mockQueueService } from '../../shared/mocks/mock-queue.service';
import { mockSpotifyHttpService } from '../../shared/mocks/mock-spotify-http.service';
import { mockUserService } from '../../shared/mocks/mock-user.service';
import { SpotifyUserData } from './spotify.generated.interface';
import { SongWithUserData } from './spotify.interface';
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
