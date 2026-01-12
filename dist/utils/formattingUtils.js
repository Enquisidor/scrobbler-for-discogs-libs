import { MetadataSourceType } from '../types';
import { calculateFuzzyScore } from './fuzzyUtils';
/**
 * Clean the artist name by removing the Discogs numeric suffix (e.g., "Artist (2)")
 * and handling the ", The" suffix (e.g., "Alchemist, The" -> "The Alchemist").
 */
export const getDisplayArtistName = (name) => {
    if (!name)
        return '';
    // Remove Discogs numeric suffix like " (2)"
    let cleaned = name.replace(/\s\(\d+\)$/, '').trim();
    // Handle "Name, The" -> "The Name"
    // Case-insensitive check for ", The" at the end of the string
    if (cleaned.toLowerCase().endsWith(', the')) {
        const base = cleaned.substring(0, cleaned.length - 5).trim();
        return `The ${base}`;
    }
    return cleaned;
};
/**
 * Helper to determine the string used to join two artists based on the 'join' property.
 */
export const getArtistJoiner = (join) => {
    // If join is undefined or null, standard list behavior is comma-space.
    if (join === undefined || join === null) {
        return ', ';
    }
    // If join is explicitly an empty string "", Discogs usually implies a space (e.g. "Run" + "" + "D.M.C.").
    // Previous logic defaulted this to a comma, which was incorrect for these cases.
    if (join === '') {
        return ' ';
    }
    const trimmed = join.trim();
    // If the join is just whitespace, preserve it (e.g. " ")
    if (trimmed.length === 0) {
        return join;
    }
    // If it's a comma, standard formatting is comma+space
    if (trimmed === ',') {
        return ', ';
    }
    // For other joiners (Ampersand, 'feat', 'vs'), wrap with spaces.
    // e.g. " & " -> " & "
    return ` ${trimmed} `;
};
/**
 * Formats a list of artists into a single string using the 'join' attribute provided by Discogs.
 * Respects Artist Name Variation (anv) if present.
 */
export const formatArtistNames = (artists) => {
    if (!artists || artists.length === 0)
        return '';
    return artists.reduce((acc, artist, index) => {
        // Use ANV if available, otherwise fallback to primary name
        const nameToUse = artist.anv || artist.name;
        const displayName = getDisplayArtistName(nameToUse);
        if (index === 0) {
            return displayName;
        }
        // Use the joiner from the PREVIOUS artist to connect to the CURRENT artist.
        const prev = artists[index - 1];
        const joiner = getArtistJoiner(prev.join);
        return acc + joiner + displayName;
    }, '');
};
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
export function validateArtistName(artist, sourceString) {
    const standard = getDisplayArtistName(artist.name);
    const anv = artist.anv ? getDisplayArtistName(artist.anv) : null;
    // If no source string, default to ANV or Standard (Discogs behavior)
    if (!sourceString)
        return anv || standard;
    // Split source into chunks to handle "Artist A & Artist B" scenarios
    // We match against chunks to see if our artist name appears in the source
    const chunks = sourceString.split(/\s*(?:,|&|\bfeat\.|\bvs\.|\band\b)\s*/i)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    // Helper to find best score against any chunk
    const getBestScore = (target) => {
        if (!target)
            return 0;
        let maxScore = Math.max(0, calculateFuzzyScore(target, sourceString));
        for (const chunk of chunks) {
            maxScore = Math.max(maxScore, calculateFuzzyScore(target, chunk));
        }
        return maxScore;
    };
    const THRESHOLD = 0.85; // High confidence required
    // Case 1: Discogs has an ANV
    if (anv) {
        const anvScore = getBestScore(anv);
        // If ANV matches the source well, we VALIDATE it and USE it.
        // We prioritize the ANV (the specific intent of the release) over the Standard name
        // as long as the source confirms it's not completely wrong.
        if (anvScore >= THRESHOLD) {
            return anv;
        }
        // ANV did not match source well (e.g. "AFX" vs "Aphex Twin").
        // Check if Standard name matches source.
        const standardScore = getBestScore(standard);
        if (standardScore >= THRESHOLD) {
            return standard; // Correction: Use Standard
        }
        // Neither matched the source well. 
        // We fallback to Discogs preference (ANV).
        return anv;
    }
    // Case 2: No ANV in Discogs.
    // We just return the standard name.
    return standard;
}
/**
 * Constructs a display string for the artist, intelligently merging Discogs data with External Metadata.
 */
export function getSmartArtistDisplay(artists, metadata, settings) {
    const sourceMeta = settings.artistSource === MetadataSourceType.Apple ? metadata?.apple : metadata?.musicbrainz;
    const sourceString = sourceMeta?.artist || '';
    // If we are using Discogs source, or no metadata available, standard behavior
    if (settings.artistSource === MetadataSourceType.Discogs || !sourceString) {
        return formatArtistNames(artists);
    }
    // We have external metadata. Validate each artist against it.
    const validatedArtists = artists.map(artist => {
        const bestName = validateArtistName(artist, sourceString);
        // We return a new object with the chosen name as the 'name' property, removing ANV to prevent formatArtistNames from overriding it.
        return { ...artist, name: bestName, anv: undefined };
    });
    return formatArtistNames(validatedArtists);
}
/**
 * Creates a "simple" version of a search term by lowercasing,
 * removing accents (diacritics), and stripping most non-alphanumeric characters.
 * This is useful for creating fallback search queries.
 * e.g., "Sólstafir" -> "solstafir"
 */
export const normalizeSearchTerm = (str) => {
    if (!str)
        return '';
    return str
        .toLowerCase()
        // Decompose accented characters into base character + combining mark
        .normalize('NFD')
        // Remove combining diacritical marks
        .replace(/[\u0300-\u036f]/g, '')
        // Remove most non-alphanumeric characters, but keep spaces and hyphens
        .replace(/[^\w\s-]/g, '')
        // Collapse multiple whitespace characters into a single space
        .replace(/\s+/g, ' ')
        .trim();
};
