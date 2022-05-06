import { SpotifyService } from './spotify.service';

describe('SpotifyService', () => {
  let spotifyService = new SpotifyService();

  beforeEach(() => {
    spotifyService = new SpotifyService();
  });

  describe('roundRobinSort()', () => {
    it('should round robin sort', () => {
      const unsorted = [
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '3',
          track: '3',
        },
        {
          accessToken: '3',
          track: '3',
        },
        {
          accessToken: '2',
          track: '2',
        },
        {
          accessToken: '1',
          track: '1',
        },
      ];

      const sorted = [
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '3',
          track: '3',
        },
        {
          accessToken: '2',
          track: '2',
        },
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '3',
          track: '3',
        },
        {
          accessToken: '1',
          track: '1',
        },
      ];
      expect(spotifyService.roundRobinSort(unsorted)).toStrictEqual(sorted);
    });

    it('should round robin sort when only one access token exists', () => {
      const unsorted = [
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '1',
          track: '1',
        },
      ];

      const sorted = [
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '1',
          track: '1',
        },
        {
          accessToken: '1',
          track: '1',
        },
      ];
      expect(spotifyService.roundRobinSort(unsorted)).toStrictEqual(sorted);
    });
  });
});
