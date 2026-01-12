import { MetadataSourceType } from '../types';
import { formatArtistNames, validateArtistName } from './formattingUtils';
export function applyMetadataCorrections(rawCollection, allMetadata, settings) {
    return rawCollection.map(release => {
        const meta = allMetadata[release.id];
        if (!meta)
            return release;
        const newBasicInfo = { ...release.basic_information };
        let hasChanged = false;
        // --- Artist Correction Logic ---
        if (settings.artistSource !== MetadataSourceType.Discogs) {
            const sourceMeta = settings.artistSource === MetadataSourceType.Apple ? meta.apple : meta.musicbrainz;
            const sourceString = sourceMeta?.artist;
            if (sourceString) {
                const originalArtists = newBasicInfo.artists;
                // Map each artist to their best validated name (ANV vs Standard vs Source)
                const updatedArtists = originalArtists.map(artist => {
                    const bestName = validateArtistName(artist, sourceString);
                    // IMPORTANT: We clear 'anv' here because we have resolved the best name into 'name'.
                    // If we left 'anv', formatArtistNames might prefer it over our carefully chosen 'name'.
                    return {
                        ...artist,
                        name: bestName,
                        anv: undefined // Clear ANV
                    };
                });
                // Reconstruct the display name using the validated artists
                const reconstructedDisplayName = formatArtistNames(updatedArtists);
                // If the name changed, or the artist objects changed (deep check approximated), update.
                if (reconstructedDisplayName !== newBasicInfo.artist_display_name) {
                    newBasicInfo.artist_display_name = reconstructedDisplayName;
                    newBasicInfo.artists = updatedArtists;
                    hasChanged = true;
                }
                else if (JSON.stringify(newBasicInfo.artists) !== JSON.stringify(updatedArtists)) {
                    // Even if display string is same, individual artist fields might have updated (e.g. clearing ANV)
                    newBasicInfo.artists = updatedArtists;
                    hasChanged = true;
                }
            }
        }
        // --- Album Correction Logic ---
        if (settings.albumSource !== MetadataSourceType.Discogs) {
            const sourceMeta = settings.albumSource === MetadataSourceType.Apple ? meta.apple : meta.musicbrainz;
            if (sourceMeta && sourceMeta.album && newBasicInfo.title !== sourceMeta.album) {
                newBasicInfo.title = sourceMeta.album;
                hasChanged = true;
            }
        }
        if (hasChanged) {
            return {
                ...release,
                basic_information: newBasicInfo,
            };
        }
        return release;
    });
}
