import { User } from '../../shared/db/models/User';
import { SpotifyTrack } from './spotify.generated.interface';

export interface SpotifyUserDataExplicitContent {
  filter_enabled: boolean;
  filter_locked: boolean;
}

export interface SpotifyUserDataExternalUrls {
  spotify: string;
}

export interface SpotifyUserDataFollowers {
  href: string;
  total: number;
}

export interface SpotifyUserData {
  country: string;
  display_name: string;
  email: string;
  explicit_content: SpotifyUserDataExplicitContent;
  external_urls: SpotifyUserDataExternalUrls;
  followers: SpotifyUserDataFollowers;
  href: string;
  id: string;
  images: string[];
  product: string;
  type: string;
  uri: string;
}

export interface MemberMusic {
  user: User;
  topTracks: any;
  likedTracks: any;
}

export interface MemberPlaylistItem {
  user: User;
  tracks: any[];
}

export interface SongWithUserData extends SpotifyTrack {
  accessToken: string;
  refreshToken: string;
}
