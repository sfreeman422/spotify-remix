import { UserService } from '../../services/user/user.service';

export const mockUserService: UserService = {
  getUser: jest.fn(),
  saveUser: jest.fn(),
  getUserWithRelations: jest.fn(),
  updateExistingUser: jest.fn(),
  savePlaylist: jest.fn(),
  getAllOwnedPlaylists: jest.fn(),
  getPlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  updatePlaylistMembers: jest.fn(),
  saveSongs: jest.fn(),
  getPlaylistHistory: jest.fn(),
};
