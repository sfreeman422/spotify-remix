export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

export interface SpotifyImage {
  height: number;
  url: string;
  width: number;
}

export interface SpotifyAlbum {
  album_type: string;
  artists: SpotifyArtist[];
  available_markets: string[];
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

export interface SpotifyExternalIds {
  isrc: string;
}

export interface SpotifyTrack {
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: SpotifyExternalIds;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

export interface SpotifyLikedSong {
  added_at: Date;
  track: SpotifyTrack;
}

export interface SpotifyResponse<T> {
  items: T;
  total: number;
  limit: number;
  offset: number;
  href: string;
  previous?: string;
  next?: string;
}

export interface SpotifyPlaylistOwner {
  display_name: string;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  type: string;
  uri: string;
}

export interface SpotifyPlaylistTracks {
  href: string;
  total: number;
}

export interface SpotifyPlaylist {
  collaborative: boolean;
  description: string;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: SpotifyPlaylistOwner;
  primary_color?: any;
  public: boolean;
  snapshot_id: string;
  tracks: SpotifyPlaylistTracks;
  type: string;
  uri: string;
}

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
