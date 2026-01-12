import { AppleSearchStrategyType } from '../../types';
import { normalizeSearchTerm } from '../../utils/formattingUtils';
import { cleanForSearch } from '../../utils/fuzzyUtils';
export function generateSearchStrategies(release, settings) {
    const info = release.basic_information;
    const strategies = [];
    const artistDisplayName = info.artist_display_name;
    const title = info.title;
    if (!artistDisplayName || !title) {
        return [];
    }
    // --- SPECIAL CASE: Artist-only lookup for collaboration fallback ---
    if (title === "Artist Correction Search") {
        const cleanedArtist = cleanForSearch(artistDisplayName);
        const normalizedArtist = normalizeSearchTerm(artistDisplayName);
        strategies.push({
            query: cleanedArtist,
            type: AppleSearchStrategyType.ARTIST_ONLY,
            entity: 'musicArtist',
        });
        if (normalizedArtist !== cleanedArtist) {
            strategies.push({
                query: normalizedArtist,
                type: AppleSearchStrategyType.ARTIST_ONLY,
                entity: 'musicArtist',
            });
        }
        return strategies;
    }
    // FIX: Check the actual source settings, not temporary flags.
    const isCorrectingArtist = settings.artistSource === 'apple';
    const isCorrectingAlbum = settings.albumSource === 'apple';
    if (!isCorrectingArtist && !isCorrectingAlbum) {
        return [];
    }
    const cleanedTitle = cleanForSearch(title);
    // When correcting the ARTIST:
    // We only generate strategies IF there is an ANV (Artist Name Variation) to validate.
    // As per requirement: "Apple only needs to be consulted if discogs provides 'anv'"
    if (isCorrectingArtist) {
        // Check if any primary artist has an ANV
        const artistsWithAnv = info.artists.filter(a => !!a.anv);
        if (artistsWithAnv.length > 0) {
            // 1. Search using the Album Title (Contextual search)
            strategies.push({
                query: cleanedTitle,
                type: AppleSearchStrategyType.ALBUM_PLUS_YEAR,
                attribute: 'albumTerm',
                entity: 'album',
            });
            // 2. Search using the ANV(s) explicitly
            artistsWithAnv.forEach(artist => {
                if (artist.anv) {
                    const cleanedAnv = cleanForSearch(artist.anv);
                    strategies.push({
                        query: cleanedAnv,
                        type: AppleSearchStrategyType.ARTIST_PLUS_YEAR,
                        attribute: 'artistTerm',
                        entity: 'album',
                    });
                    strategies.push({
                        query: cleanedAnv,
                        type: AppleSearchStrategyType.ARTIST_PLUS_YEAR,
                        omitEntity: true,
                    });
                }
            });
        }
    }
    // When correcting the ALBUM, search using the ARTIST name (standard name) as the anchor.
    // This logic remains active even if no ANV is present, as we are fixing the Album title.
    if (isCorrectingAlbum) {
        const cleanedArtist = cleanForSearch(artistDisplayName);
        strategies.push({
            query: cleanedArtist,
            type: AppleSearchStrategyType.ARTIST_PLUS_YEAR,
            attribute: 'artistTerm',
            entity: 'album',
        });
        strategies.push({
            query: cleanedArtist,
            type: AppleSearchStrategyType.ARTIST_PLUS_YEAR,
            omitEntity: true,
        });
    }
    return strategies;
}
