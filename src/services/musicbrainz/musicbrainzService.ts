import type { DiscogsRelease, ServiceMetadata, MusicBrainzRelease } from '../../types';
import { fetchFromMusicBrainz } from './musicbrainzAPI';
import { calculateFuzzyScore, cleanForSearch } from '../../utils/fuzzyUtils';

const MB_ACCEPTANCE_THRESHOLD = 0.8;

// Helper to format MB artist credits into a single string
const formatMBArtists = (release: MusicBrainzRelease): string => {
    if (!release['artist-credit']) return '';
    return release['artist-credit'].reduce((acc, credit) => {
        return acc + credit.name + (credit.joinphrase || '');
    }, '');
};

const calculateMBScore = (discogs: DiscogsRelease, mbRelease: MusicBrainzRelease): number => {
    // 1. Barcode match (if available) - Very strong signal
    if (mbRelease.barcode && discogs.identifiers) {
        const hasBarcodeMatch = discogs.identifiers.some(id => 
            id.type === 'Barcode' && id.value.replace(/\s+/g, '') === mbRelease.barcode
        );
        if (hasBarcodeMatch) return 1.0;
    }

    const discogsTitle = discogs.basic_information.title;
    const discogsArtist = discogs.basic_information.artist_display_name;
    const mbTitle = mbRelease.title;
    const mbArtist = formatMBArtists(mbRelease);

    const titleScore = calculateFuzzyScore(discogsTitle, mbTitle);
    const artistScore = calculateFuzzyScore(discogsArtist, mbArtist);

    return (titleScore * 0.6) + (artistScore * 0.4);
};

export const fetchMusicBrainzMetadata = async (
    release: DiscogsRelease,
    signal?: AbortSignal
): Promise<ServiceMetadata | null> => {
    if (!release.basic_information) return null;

    let searchResults: MusicBrainzRelease[] = [];

    // 1. Try Searching by Barcode first (High precision)
    const barcode = release.identifiers?.find(id => id.type === 'Barcode')?.value.replace(/\s+/g, '');
    if (barcode) {
        try {
            const data = await fetchFromMusicBrainz(`barcode:${barcode}`, signal);
            if (data.releases.length > 0) {
                searchResults = data.releases;
            }
        } catch (e) {
            console.warn('[MusicBrainz] Barcode search failed', e);
        }
    }

    // 2. If no barcode results, search by Artist AND Release Name
    if (searchResults.length === 0) {
        try {
            const artist = cleanForSearch(release.basic_information.artist_display_name);
            const title = cleanForSearch(release.basic_information.title);
            // Boost exact matches if possible in Lucene syntax, here we just do AND
            const query = `release:"${title}" AND artist:"${artist}"`;
            
            const data = await fetchFromMusicBrainz(query, signal);
            searchResults = data.releases;
        } catch (e) {
            console.warn('[MusicBrainz] Text search failed', e);
        }
    }

    if (searchResults.length === 0) return null;

    // 3. Find Best Match
    let bestMatch: MusicBrainzRelease | null = null;
    let bestScore = 0;

    for (const res of searchResults) {
        const score = calculateMBScore(release, res);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = res;
        }
    }

    if (!bestMatch || bestScore < MB_ACCEPTANCE_THRESHOLD) {
        return null;
    }

    return {
        artist: formatMBArtists(bestMatch),
        album: bestMatch.title,
        country: bestMatch.country,
        lastChecked: Date.now(),
        score: bestScore,
        rawResult: bestMatch
    };
};