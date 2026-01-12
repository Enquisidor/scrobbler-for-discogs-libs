import type { MusicBrainzSearchResponse } from '../../types';
export declare const fetchFromMusicBrainz: (query: string, signal: AbortSignal | undefined) => Promise<MusicBrainzSearchResponse>;
