import type { ITunesResponse } from '../../types';
/**
 * A dedicated utility for making raw fetch requests to the Apple Music (iTunes) Search API.
 * It handles URL construction, timeouts, and JSON parsing.
 */
export declare const fetchFromAppleMusic: (strategyQuery: string, entity: "album" | "musicArtist" | undefined, omitEntity: boolean, attribute: "artistTerm" | "albumTerm" | undefined, offset: number, parentSignal: AbortSignal | undefined) => Promise<ITunesResponse>;
