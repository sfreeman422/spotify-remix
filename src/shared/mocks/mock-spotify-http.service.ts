import { SpotifyHttpService } from '../../services/spotify/spotify-http.service';

export const mockSpotifyHttpService: SpotifyHttpService = {
  baseUrl: 'http://test.com',
  baseSelfUrl: 'http://test.com/self',
  baseUserUrl: 'http://test.com/user',
  basePlaylistUrl: 'http://test.com/playlist',
  getUserData: jest.fn(),
  getUserPlaylists: jest.fn(),
  createUserPlaylist: jest.fn(),
  subscribeToPlaylist: jest.fn(),
  getPlaylistTracks: jest.fn(),
  removeAllPlaylistTracks: jest.fn(),
  addSongsToPlaylist: jest.fn(),
  getTopSongsByUser: jest.fn(),
  getLikedSongsByUser: jest.fn(),
};
