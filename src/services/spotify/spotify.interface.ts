import { SpotifyPlaylist, SpotifyTrack } from './spotify.generated.interface';

export interface SongWithUserData extends SpotifyTrack {
  spotifyId: string;
}

export interface PlaylistData {
  ownedPlaylists: SpotifyPlaylist[];
  orphanPlaylists: string[];
  subscribedPlaylists: SpotifyPlaylist[];
}
