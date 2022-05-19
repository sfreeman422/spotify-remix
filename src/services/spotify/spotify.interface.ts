import { User } from '../../shared/db/models/User';
import { SpotifyPlaylist, SpotifyTrack } from './spotify.generated.interface';

export interface SongWithUserData extends SpotifyTrack {
  spotifyId: string;
}

export interface PlaylistData {
  ownedPlaylists: SpotifyPlaylist[];
  orphanPlaylists: string[];
  subscribedPlaylists: SpotifyPlaylist[];
}

export interface SongsByUser {
  user: User;
  topSongs: SongWithUserData[];
  likedSongs?: SongWithUserData[];
}
