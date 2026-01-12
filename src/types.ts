// --- Shared Enums ---
export enum SortOption {
  AddedNewest = 'added_newest',
  AddedOldest = 'added_oldest',
  ArtistAZ = 'artist_az',
  ArtistZA = 'artist_za',
  AlbumAZ = 'album_az',
  AlbumZA = 'album_za',
  YearNewest = 'year_newest',
  YearOldest = 'year_oldest',
  LabelAZ = 'label_az',
  LabelZA = 'label_za',
  FormatAZ = 'format_az',
  FormatZA = 'format_za',
  CatNoAZ = 'catno_az',
  CatNoZA = 'catno_za',
  SearchRelevance = 'search_relevance',
}

export enum MetadataSourceType {
  Discogs = 'discogs',
  Apple = 'apple',
  MusicBrainz = 'musicbrainz',
}

// --- Discogs API Types ---
export interface DiscogsArtist {
  id: number;
  name: string;
  anv?: string; // Artist Name Variation
  join?: string;
  resource_url?: string;
}

export interface DiscogsExtraArtist {
  id: number;
  name: string;
  anv?: string;
  role: string;
  join: string;
}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface DiscogsLabel {
  name: string;
  catno: string;
  id: number;
}

export interface DiscogsIdentifier {
  type: string;
  value: string;
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration: string;
  type_?: string;
  sub_tracks?: DiscogsTrack[];
  artists?: DiscogsArtist[];
  extraartists?: DiscogsExtraArtist[];
}

export interface DiscogsReleaseBasic {
  title: string;
  artists: DiscogsArtist[];
  year: number;
  thumb: string;
  cover_image: string;
  formats: DiscogsFormat[];
  labels: DiscogsLabel[];
  artist_display_name: string;
}

export interface DiscogsRelease {
  id: number;
  instance_id: number;
  date_added: string;
  basic_information: DiscogsReleaseBasic;
  tracklist?: DiscogsTrack[];
  identifiers?: DiscogsIdentifier[]; // Added for matching barcodes
}

// ITunes Types
export interface ITunesResult {
    wrapperType: string;
    collectionType: string;
    artistName: string;
    collectionName: string;
    collectionCensoredName: string;
    artistViewUrl: string;
    collectionViewUrl: string;
    artworkUrl100: string;
    collectionPrice: number;
    releaseDate: string;
    primaryGenreName: string;
    trackCount: number;
    country: string;
    currency: string;
    copyright?: string; // Contains label info usually
    collectionExplicitness?: string;
}

export interface ITunesResponse {
    resultCount: number;
    results: ITunesResult[];
}

// MusicBrainz Types
export interface MusicBrainzArtistCredit {
    name: string;
    artist: {
        id: string;
        name: string;
        'sort-name': string;
    };
    joinphrase?: string;
}

export interface MusicBrainzRelease {
    id: string;
    title: string;
    date?: string;
    country?: string;
    'artist-credit'?: MusicBrainzArtistCredit[];
    score?: number; // Search score (0-100)
    barcode?: string;
}

export interface MusicBrainzSearchResponse {
    created: string;
    count: number;
    offset: number;
    releases: MusicBrainzRelease[];
}

export enum AppleSearchStrategyType {
    ARTIST_PLUS_YEAR = 'ARTIST_PLUS_YEAR', // Search by Artist+Year to correct/find Album
    ALBUM_PLUS_YEAR = 'ALBUM_PLUS_YEAR',   // Search by Album+Year to correct/find Artist
    ARTIST_ONLY = 'ARTIST_ONLY',           // Search directly for an artist as a final fallback
}

export enum ReleaseType {
    ALBUM = 'Album',
    SINGLE = 'Single',
    EP = 'EP',
    COMPILATION = 'Compilation',
    UNKNOWN = 'Unknown',
}

export interface AppleSearchStrategy {
    query: string;
    type: AppleSearchStrategyType;
    attribute?: 'artistTerm' | 'albumTerm';
    omitEntity?: boolean;
    entity?: 'album' | 'musicArtist';
}

// --- App-specific Types ---
export interface Credentials {
  discogsUsername: string;
  discogsAccessToken: string;
  discogsAccessTokenSecret: string;
  lastfmApiKey: string;
  lastfmSecret: string;
  lastfmSessionKey: string;
  lastfmUsername: string;
}

export type MetadataSource = 'discogs' | 'apple' | 'musicbrainz';

export interface Settings {
  selectAllTracksPerRelease: boolean;
  selectSubtracksByDefault: boolean;
  showFeatures: boolean;
  selectFeaturesByDefault: boolean;
  artistSource: MetadataSource;
  albumSource: MetadataSource;
}

export interface ServiceMetadata {
    artist?: string;
    album?: string;
    lastChecked?: number;
    primaryGenreName?: string;
    copyright?: string;
    country?: string;
    explicit?: boolean;
    score?: number;
    rawResult?: any; // Can hold ITunesResult or MusicBrainzRelease
}

export interface AppleMusicMetadata {
    artist: string;
    album?: string;
    primaryGenreName?: string;
    copyright?: string;
    country?: string;
    explicit?: boolean;
    score?: number;
    rawItunesResult?: ITunesResult | null;
}

export interface CombinedMetadata {
    apple?: ServiceMetadata;
    musicbrainz?: ServiceMetadata;
}

export interface QueueItem extends DiscogsRelease {
  instanceKey: string;
  tracklist: DiscogsTrack[] | undefined;
  isLoading: boolean;
  useTrackArtist: boolean;
  error?: string;
  scrobbledTrackCount?: number;
  scrobbledTrackKeys?: string[];
}

export type SelectedTracks = Record<string, Set<string>>;
export type SelectedFeatures = Record<string, Set<string>>;
// Map of InstanceKey -> TrackKey -> Set of Selected Artist Names
export type ArtistSelections = Record<string, Record<string, Set<string>>>;

export interface LastfmTrackScrobble {
  artist: string;
  track: string;
  album?: string;
  timestamp: number;
}