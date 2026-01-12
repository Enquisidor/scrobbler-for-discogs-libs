import type { DiscogsTrack, QueueItem, SelectedTracks, ArtistSelections, CombinedMetadata, DiscogsRelease, LastfmTrackScrobble, DiscogsArtist, Settings } from '../types';
export declare function isVariousArtist(name: string): boolean;
export declare function getReleaseDisplayArtist(release: DiscogsRelease | QueueItem, metadata: CombinedMetadata | undefined, settings: Settings): string;
export declare function getReleaseDisplayTitle(release: DiscogsRelease | QueueItem, metadata: CombinedMetadata | undefined, settings: Settings): string;
export declare function getTrackDisplayArtist(track: DiscogsTrack, release: DiscogsRelease, metadata: Record<number, CombinedMetadata> | undefined, settings: Settings, useTrackArtist?: boolean): string;
export declare function getTrackFeaturedArtists(track: DiscogsTrack): string;
export declare function getTrackCreditsStructured(track: DiscogsTrack): {
    role: string;
    artists: DiscogsArtist[];
}[];
export declare function calculateScrobbleTimestamps(queue: QueueItem[], selectedTracks: SelectedTracks, currentTime: number, timeOffset: number): Record<string, Record<string, number>>;
export declare function prepareTracksForScrobbling(queue: QueueItem[], selectedTracks: SelectedTracks, artistSelections: ArtistSelections, metadataMap: Record<number, CombinedMetadata>, timeOffset: number, settings: Settings): LastfmTrackScrobble[];
