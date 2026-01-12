import type { DiscogsArtist, CombinedMetadata, Settings } from '../types';
/**
 * Clean the artist name by removing the Discogs numeric suffix (e.g., "Artist (2)")
 * and handling the ", The" suffix (e.g., "Alchemist, The" -> "The Alchemist").
 */
export declare const getDisplayArtistName: (name: string) => string;
/**
 * Helper to determine the string used to join two artists based on the 'join' property.
 */
export declare const getArtistJoiner: (join?: string) => string;
/**
 * Formats a list of artists into a single string using the 'join' attribute provided by Discogs.
 * Respects Artist Name Variation (anv) if present.
 */
export declare const formatArtistNames: (artists: {
    name: string;
    join?: string;
    anv?: string;
}[]) => string;
/**
 * Validates which name (ANV or Standard) best matches the authoritative source string.
 * Returns the name that should be displayed.
 *
 * Logic:
 * 1. If source is missing, use Discogs default (ANV if exists, else Standard).
 * 2. If ANV exists and matches source well (threshold met) -> Use ANV. (Validation Success)
 * 3. If ANV fails but Standard matches source well -> Use Standard. (Correction)
 * 4. Fallback -> Use ANV if exists, else Standard.
 */
export declare function validateArtistName(artist: DiscogsArtist, sourceString: string): string;
/**
 * Constructs a display string for the artist, intelligently merging Discogs data with External Metadata.
 */
export declare function getSmartArtistDisplay(artists: DiscogsArtist[], metadata: CombinedMetadata | undefined, settings: Settings): string;
/**
 * Creates a "simple" version of a search term by lowercasing,
 * removing accents (diacritics), and stripping most non-alphanumeric characters.
 * This is useful for creating fallback search queries.
 * e.g., "Sólstafir" -> "solstafir"
 */
export declare const normalizeSearchTerm: (str: string) => string;
