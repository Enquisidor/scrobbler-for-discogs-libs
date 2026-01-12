
import type { DiscogsRelease, ITunesResult, AppleSearchStrategy, Settings } from '../../types';
import { AppleSearchStrategyType, ReleaseType } from '../../types';
import { calculateFuzzyScore } from '../../utils/fuzzyUtils';

export function getDiscogsReleaseType(release: DiscogsRelease): ReleaseType {
  const descriptions = release.basic_information.formats
    ?.flatMap(f => f.descriptions || [])
    .map(d => d.toLowerCase());

  if (!descriptions || descriptions.length === 0) {
    return ReleaseType.UNKNOWN;
  }

  if (descriptions.includes('single')) return ReleaseType.SINGLE;
  if (descriptions.includes('ep')) return ReleaseType.EP;
  if (descriptions.includes('compilation')) return ReleaseType.COMPILATION;
  if (descriptions.includes('album') || descriptions.includes('lp')) return ReleaseType.ALBUM;
  
  return ReleaseType.UNKNOWN;
}

export function getAppleReleaseType(result: ITunesResult): ReleaseType {
  const collectionName = result.collectionName.toLowerCase();
  const artistName = result.artistName.toLowerCase();

  if (collectionName.endsWith(' - single')) return ReleaseType.SINGLE;
  if (collectionName.endsWith(' - ep')) return ReleaseType.EP;
  // A track count of 1 is a very strong signal for a single.
  if (result.trackCount === 1) return ReleaseType.SINGLE;
  if (artistName === 'various artists') return ReleaseType.COMPILATION;

  return ReleaseType.ALBUM;
}

// Helper to get both scores, avoiding repeated calculation.
export function getScores(discogs: DiscogsRelease, apple: ITunesResult): { artistScore: number, albumScore: number } {
    const info = discogs.basic_information;
    const appleArtist = apple.artistName;

    // Start with the score against the full, formatted display name.
    let finalArtistScore = calculateFuzzyScore(info.artist_display_name, appleArtist);

    // Score against individual artists and their ANVs
    const individualArtists = info.artists;
    if (individualArtists && individualArtists.length > 0) {
        for (const artist of individualArtists) {
            // Check standard name
            const individualScore = calculateFuzzyScore(artist.name, appleArtist);
            if (individualScore > finalArtistScore) {
                finalArtistScore = individualScore;
            }
            
            // Check ANV (Artist Name Variation) if present
            if (artist.anv) {
                const anvScore = calculateFuzzyScore(artist.anv, appleArtist);
                if (anvScore > finalArtistScore) {
                    finalArtistScore = anvScore;
                }
            }
        }
    }

    const albumScore = calculateFuzzyScore(info.title, apple.collectionName);

    return { artistScore: finalArtistScore, albumScore };
}

/**
 * Extracts a best-effort label name from a copyright string.
 * e.g., "℗ 2023 Capitol Records, LLC" -> "Capitol Records"
 */
export function extractLabelFromCopyright(copyright: string | undefined): string {
    if (!copyright) return '';
    let label = copyright;
    // 1. Remove copyright symbols and year from the start
    label = label.replace(/^[℗©\s&]*\d{4}\s+/, '');
    // 2. Remove common legal suffixes from the end
    label = label.replace(/(,?\s+(LLC|Inc|Ltd|Limited|Corp))\.?$/i, '');
    return label.trim();
}

/**
 * Calculates a fuzzy match score between the Discogs labels and the extracted Apple label.
 */
function getLabelScore(discogs: DiscogsRelease, apple: ITunesResult): number {
    const appleLabel = extractLabelFromCopyright(apple.copyright);
    if (!appleLabel) return 0;

    const discogsLabels = discogs.basic_information.labels;
    if (!discogsLabels || discogsLabels.length === 0) return 0;

    let maxScore = 0;
    for (const discogsLabel of discogsLabels) {
        // We compare against the cleaned label name from Discogs
        const score = calculateFuzzyScore(discogsLabel.name, appleLabel);
        if (score > maxScore) {
            maxScore = score;
        }
    }
    return maxScore;
}

const PRIMARY_SCORE_THRESHOLD = 0.65;

/**
 * Calculates a score based on how well an Apple Music result matches a Discogs release.
 * The score validates the metadata field the user wants to correct, based on settings.
 */
export function calculateTruthScore(
    discogs: DiscogsRelease,
    apple: ITunesResult,
    strategy: AppleSearchStrategy,
    settings: Settings
): number {
    const scores = getScores(discogs, apple);
    
    // For artist-only searches, it's simple. No bonuses apply.
    if (strategy.type === AppleSearchStrategyType.ARTIST_ONLY) {
        const score = scores.artistScore;
        console.log(`[Score] D: "${discogs.basic_information.artist_display_name}" vs A: "${apple.artistName}" (ARTIST_ONLY) -> Score: ${score.toFixed(3)}`);
        return score;
    }

    let primaryScore: number;
    let primaryScoreType: string;

    // FIX: The temporary `useAppleMusic...` flags are not reliable.
    // The source of truth is `artistSource` and `albumSource`.
    const useAppleMusicArtist = settings.artistSource === 'apple';
    const useAppleMusicAlbum = settings.albumSource === 'apple';

    if (useAppleMusicArtist && !useAppleMusicAlbum) {
        primaryScore = scores.artistScore;
        primaryScoreType = 'Artist';
    } else if (!useAppleMusicArtist && useAppleMusicAlbum) {
        primaryScore = scores.albumScore;
        primaryScoreType = 'Album';
    } else { // Correcting both: This is where the logic needs to be strategy-aware.
        if (strategy.type === AppleSearchStrategyType.ALBUM_PLUS_YEAR) {
            // This strategy searches by album title to find the correct artist.
            // Therefore, the artist score is the one we should primarily judge.
            primaryScore = scores.artistScore;
            primaryScoreType = 'Artist (from Album search)';
        } else if (strategy.type === AppleSearchStrategyType.ARTIST_PLUS_YEAR) {
            // This strategy searches by artist name to find the correct album.
            // Therefore, the album score is the one we should primarily judge.
            primaryScore = scores.albumScore;
            primaryScoreType = 'Album (from Artist search)';
        } else {
            // For other strategies (e.g., broad fallbacks without attributes),
            // the original logic of taking the best of the two makes sense.
            primaryScore = Math.max(scores.artistScore, scores.albumScore);
            primaryScoreType = scores.artistScore >= scores.albumScore ? 'Artist (Both)' : 'Album (Both)';
        }
    }

    if (primaryScore < PRIMARY_SCORE_THRESHOLD) {
        const logObject = {
            discogs: `${discogs.basic_information.artist_display_name} - ${discogs.basic_information.title}`,
            apple: `${apple.artistName} - ${apple.collectionName}`,
            primaryScore: { type: primaryScoreType, value: primaryScore.toFixed(3) },
            status: `REJECTED (below threshold ${PRIMARY_SCORE_THRESHOLD})`,
            strategy: `${strategy.type} (${strategy.attribute || 'Broad'})`,
        };
        console.log('[Score]', logObject);
        return primaryScore;
    }

    // --- Calculate individual bonus scores (0 to 1) ---
    // Year Score
    let yearScore = 0;
    const discogsYear = discogs.basic_information.year;
    if (discogsYear && discogsYear > 0) {
        const appleYear = new Date(apple.releaseDate).getFullYear();
        if (appleYear && !isNaN(appleYear) && appleYear > 0) {
            const yearDiff = Math.abs(discogsYear - appleYear);
            yearScore = Math.max(0, 1 - (yearDiff / 5.0));
        }
    }

    // Track Count Score
    let trackCountScore = 0;
    const discogsTrackCount = discogs.tracklist?.filter(t => t.type_ !== 'heading').length;
    if (discogsTrackCount && discogsTrackCount > 0) {
        const appleTrackCount = apple.trackCount;
        if (appleTrackCount > 0) {
            trackCountScore = Math.min(discogsTrackCount, appleTrackCount) / Math.max(discogsTrackCount, appleTrackCount);
        }
    }
    
    // Label Score
    const labelScore = getLabelScore(discogs, apple);

    // --- Apply smaller, multiplicative weights ---
    let finalScore = primaryScore;
    finalScore *= (1 + 0.10 * yearScore);
    finalScore *= (1 + 0.15 * trackCountScore);
    finalScore *= (1 + 0.10 * labelScore);

    const finalClampedScore = Math.min(1.0, finalScore);

    const logObject = {
        discogs: `${discogs.basic_information.artist_display_name} - ${discogs.basic_information.title}`,
        apple: `${apple.artistName} - ${apple.collectionName}`,
        strategy: `${strategy.type} (${strategy.attribute || strategy.entity || 'Broad'})`,
        scores: {
            primary: { type: primaryScoreType, value: primaryScore.toFixed(3) },
            artist: scores.artistScore.toFixed(3),
            album: scores.albumScore.toFixed(3),
            year: yearScore.toFixed(3),
            trackCount: trackCountScore.toFixed(3),
            label: labelScore.toFixed(3),
        },
        weights: {
            year: `* (1 + 0.10 * ${yearScore.toFixed(3)})`,
            trackCount: `* (1 + 0.15 * ${trackCountScore.toFixed(3)})`,
            label: `* (1 + 0.10 * ${labelScore.toFixed(3)})`,
        },
        finalScore: finalClampedScore.toFixed(3),
    };
    console.log('[Score]', logObject);

    return finalClampedScore;
}


/**
 * Determines if a new result is a better match than the current best result,
 * assuming they have the same primary score. This is a tie-breaker.
 */
export function isBetterTieBreak(
    discogs: DiscogsRelease,
    newResult: ITunesResult,
    currentBestResult: ITunesResult,
    settings: Settings
): boolean {
    const newScores = getScores(discogs, newResult);
    const currentScores = getScores(discogs, currentBestResult);
    
    let secondaryScoreNew: number;
    let secondaryScoreCurrent: number;

    // FIX: Use the actual setting source properties instead of the temporary flags.
    const useAppleMusicArtist = settings.artistSource === 'apple';
    const useAppleMusicAlbum = settings.albumSource === 'apple';

    if (useAppleMusicArtist && !useAppleMusicAlbum) {
        secondaryScoreNew = newScores.albumScore;
        secondaryScoreCurrent = currentScores.albumScore;
    } else if (!useAppleMusicArtist && useAppleMusicAlbum) {
        secondaryScoreNew = newScores.artistScore;
        secondaryScoreCurrent = currentScores.artistScore;
    } else { // Correcting both: primary was max(a,b), so secondary is min(a,b).
        secondaryScoreNew = Math.min(newScores.artistScore, newScores.albumScore);
        secondaryScoreCurrent = Math.min(currentScores.artistScore, currentScores.albumScore);
    }
    
    if (secondaryScoreNew > secondaryScoreCurrent) return true;
    if (secondaryScoreNew < secondaryScoreCurrent) return false;

    // Secondary scores are equal, so use label score as a tertiary tie-breaker.
    const newLabelScore = getLabelScore(discogs, newResult);
    const currentLabelScore = getLabelScore(discogs, currentBestResult);

    return newLabelScore > currentLabelScore;
}