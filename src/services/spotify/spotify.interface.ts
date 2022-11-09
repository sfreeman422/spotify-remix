import { User } from '../../shared/db/models/User';
import { APIResponse } from '../../shared/interfaces/APIResponse.interface';
import { SpotifyPlaylist, SpotifyTrack } from './spotify-http.interface';

export interface SongWithUserData extends SpotifyTrack {
  spotifyId: string;
}

export interface PlaylistData extends APIResponse {
  ownedPlaylists: SpotifyPlaylist[];
  orphanPlaylists: string[];
  subscribedPlaylists: SpotifyPlaylist[];
}

export interface SongsByUser extends APIResponse {
  user: User;
  topSongs: SongWithUserData[];
  likedSongs: SongWithUserData[];
}
