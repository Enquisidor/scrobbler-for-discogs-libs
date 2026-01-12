

import type { DiscogsRelease, Settings, ITunesResponse, ITunesResult, AppleSearchStrategy } from '../../types';
import { generateSearchStrategies } from './strategies';
import { calculateTruthScore, isBetterTieBreak, getScores, getDiscogsReleaseType, getAppleReleaseType } from './scoring';
import { AppleSearchStrategyType, ReleaseType } from '../../types';
import { calculateFuzzyScore } from '../../utils/fuzzyUtils';
import { formatArtistNames } from '../../utils/formattingUtils';
import { fetchFromAppleMusic } from './appleMusicAPI';
// FIX: Imported the newly defined AppleMusicMetadata type.
import type { AppleMusicMetadata } from '../../types';

// Strict threshold for acceptance
const ACCEPTANCE_THRESHOLD = 0.85;
const PRE_FILTER_THRESHOLD = 0.3; // Low bar to weed out completely wrong results
const ANCHOR_FIELD_VALIDATION_THRESHOLD = 0.7; // Threshold to confirm API returned a relevant result

/**
 * A helper function that runs a set of search strategies for a given release
 * and returns the best match found.
 */
const findBestMatch = async (
    releaseForSearch: DiscogsRelease,
    settingsForThisRun: Settings,
    parentSignal: AbortSignal | undefined,
    releaseForScoring: DiscogsRelease
): Promise<{ bestMatch: ITunesResult | null, bestScore: number, bestStrategy: AppleSearchStrategy | null }> => {
    const strategies = generateSearchStrategies(releaseForSearch, settingsForThisRun);
    
    let overallBestMatch: ITunesResult | null = null;
    let overallBestScore = 0;
    let bestMatchStrategy: AppleSearchStrategy | null = null;

     for (const strategy of strategies) {
        if (parentSignal?.aborted) throw new DOMException('Aborted by parent', 'AbortError');

        let currentOffset = 0;
        let hasMorePages = true;
        let totalResultsFromServer = -1;

        while (hasMorePages) {
            if (parentSignal?.aborted) throw new DOMException('Aborted by parent', 'AbortError');
            
            try {
                const data = await fetchFromAppleMusic(
                    strategy.query,
                    strategy.entity,
                    !!strategy.omitEntity,
                    strategy.attribute,
                    currentOffset,
                    parentSignal
                );
                
                if (totalResultsFromServer === -1) totalResultsFromServer = data.resultCount;

                if (data.resultCount > 0 && data.results.length > 0) {
                    let resultsToProcess = data.results;

                    if (strategy.type === AppleSearchStrategyType.ARTIST_ONLY) {
                        resultsToProcess = data.results.filter(r => r.wrapperType === 'artist').map(r => ({ ...r, collectionType: 'Album', collectionName: r.artistName, trackCount: 0, releaseDate: '' }));
                    }

                    const discogsType = getDiscogsReleaseType(releaseForScoring);
                    const typeFilteredResults = resultsToProcess.filter(result => {
                        if (strategy.type === AppleSearchStrategyType.ARTIST_ONLY) return true;
                        if (result.wrapperType !== 'collection' || result.collectionType !== 'Album') return false;
                        if (discogsType === ReleaseType.UNKNOWN) return true;
                        const appleType = getAppleReleaseType(result);
                        if (discogsType !== ReleaseType.SINGLE && appleType === ReleaseType.SINGLE) return false;
                        if (discogsType !== ReleaseType.EP && appleType === ReleaseType.EP) return false;
                        if (discogsType === ReleaseType.SINGLE && appleType === ReleaseType.ALBUM) return false;
                        return true;
                    });

                    const validatedResults = typeFilteredResults.filter(result => {
                        if (strategy.attribute === 'albumTerm') return calculateFuzzyScore(strategy.query, result.collectionName) >= ANCHOR_FIELD_VALIDATION_THRESHOLD;
                        if (strategy.attribute === 'artistTerm') return calculateFuzzyScore(strategy.query, result.artistName) >= ANCHOR_FIELD_VALIDATION_THRESHOLD;
                        return true;
                    });

                    const preFilteredResults = validatedResults.filter(result => {
                        const { artistScore, albumScore } = getScores(releaseForScoring, result);
                        if (strategy.type === AppleSearchStrategyType.ALBUM_PLUS_YEAR) return artistScore > PRE_FILTER_THRESHOLD;
                        if (strategy.type === AppleSearchStrategyType.ARTIST_PLUS_YEAR) return albumScore > PRE_FILTER_THRESHOLD;
                        if (strategy.type === AppleSearchStrategyType.ARTIST_ONLY) return artistScore > PRE_FILTER_THRESHOLD;
                        if (!strategy.attribute) return Math.max(artistScore, albumScore) > PRE_FILTER_THRESHOLD;
                        return true;
                    });

                    for (const result of preFilteredResults) {
                        const score = calculateTruthScore(releaseForScoring, result, strategy, settingsForThisRun);
                        if (score > overallBestScore) {
                            overallBestScore = score;
                            overallBestMatch = result;
                            bestMatchStrategy = strategy;
                        } else if (score === overallBestScore && overallBestScore > 0 && overallBestMatch && isBetterTieBreak(releaseForScoring, result, overallBestMatch, settingsForThisRun)) {
                            overallBestMatch = result;
                            bestMatchStrategy = strategy;
                        }
                    }
                }

                if (overallBestScore >= ACCEPTANCE_THRESHOLD) {
                    hasMorePages = false;
                } else {
                    currentOffset += data.results.length;
                    if (data.results.length < 200 || currentOffset >= totalResultsFromServer) hasMorePages = false;
                }
            } catch (e) {
                hasMorePages = false; // Stop paginating for this strategy if an error occurs
                if (e instanceof DOMException && e.name === 'AbortError' && parentSignal?.aborted) {
                    throw e; // Propagate parent-level aborts
                }
                // Log other errors (like timeouts or network issues) but continue to the next strategy
                console.warn(`[Apple Music] Strategy page failed for query "${strategy.query}".`, e);
            }
        }
        if (overallBestScore >= ACCEPTANCE_THRESHOLD) break; // Move to the next strategy if no good match found
    }
    return { bestMatch: overallBestMatch, bestScore: overallBestScore, bestStrategy: bestMatchStrategy };
};

const processFinalResult = (
    result: { bestMatch: ITunesResult | null, bestScore: number, bestStrategy: AppleSearchStrategy | null },
    release: DiscogsRelease
): AppleMusicMetadata | null => {
    
    if (!result.bestMatch || result.bestScore < ACCEPTANCE_THRESHOLD) {
        console.log(`[Apple Music] No acceptable match found for "${release.basic_information.artist_display_name} - ${release.basic_information.title}". Best score: ${(result.bestScore * 100).toFixed(1)}%`);
        return null;
    }

    const finalArtist = result.bestMatch.artistName;
    const finalAlbum = result.bestStrategy?.type === AppleSearchStrategyType.ARTIST_ONLY 
        ? undefined 
        : result.bestMatch.collectionName;

    const discogsArtist = release.basic_information.artist_display_name;
    const discogsTitle = release.basic_information.title;
    const hasFinalArtistChanged = finalArtist !== discogsArtist;
    const hasFinalAlbumChanged = finalAlbum && finalAlbum !== discogsTitle;

    if (hasFinalArtistChanged || hasFinalAlbumChanged) {
        const strategyDesc = result.bestStrategy ? `${result.bestStrategy.type} (${result.bestStrategy.attribute || result.bestStrategy.entity || 'Broad'})` : 'Unknown';
        console.log(`[Apple Music] Final Update (${Math.round(result.bestScore * 100)}% match via ${strategyDesc}):\n  D: ${discogsArtist} - ${discogsTitle}\n  A: ${finalArtist} - ${finalAlbum || '(N/A)'}`);
    }

    return {
        artist: finalArtist,
        album: finalAlbum,
        primaryGenreName: result.bestMatch.primaryGenreName,
        copyright: result.bestMatch.copyright,
        country: result.bestMatch.country,
        explicit: result.bestMatch.collectionExplicitness === 'explicit',
        score: result.bestScore,
        rawItunesResult: result.bestMatch,
    };
};

/**
 * Handles the complex, multi-stage fallback logic for releases with multiple artists (collaborations).
 */
const handleCollaborationFallback = async (
    initialBestResult: { bestMatch: ITunesResult | null, bestScore: number, bestStrategy: AppleSearchStrategy | null },
    release: DiscogsRelease,
    settings: Settings,
    parentSignal: AbortSignal | undefined
): Promise<{ bestMatch: ITunesResult | null, bestScore: number, bestStrategy: AppleSearchStrategy | null }> => {
    console.log(`[Apple Music] Initial search failed for collaboration. Attempting iterative artist correction.`);
    
    let bestResultSoFar = initialBestResult;
    const originalArtists = release.basic_information.artists!;
    // Use Apple Music as the artist source for individual artist correction
    const artistCorrectionSettings: Settings = { ...settings, artistSource: 'apple', albumSource: 'discogs' };
    const corrections = new Map<number, string>();

    for (let i = 0; i < originalArtists.length; i++) {
        const artistToCorrect = originalArtists[i];
        if (parentSignal?.aborted) break;
        
        // --- Step A: Find a potential correction for the current artist ---
        const artistLookupRelease: DiscogsRelease = {
            ...release,
            basic_information: { ...release.basic_information, artists: [artistToCorrect], artist_display_name: artistToCorrect.name, title: "Artist Correction Search" }
        };
        const artistCorrectionResult = await findBestMatch(artistLookupRelease, artistCorrectionSettings, parentSignal, artistLookupRelease);

        const correctedName = artistCorrectionResult.bestMatch?.artistName;
        const hasFoundCorrection = correctedName && artistCorrectionResult.bestScore >= ACCEPTANCE_THRESHOLD && correctedName.toLowerCase() !== artistToCorrect.name.toLowerCase();

        if (hasFoundCorrection) {
            console.log(`[Apple Music] Correction found: "${artistToCorrect.name}" -> "${correctedName}".`);
            corrections.set(i, correctedName!);

            // --- Step B: Re-run the main search for releases, anchored on the corrected artist name ---
            const releaseForResearch: DiscogsRelease = {
                ...release,
                basic_information: { ...release.basic_information, artists: [{ ...artistToCorrect, name: correctedName! }], artist_display_name: correctedName! }
            };
            
            // --- Step C: Score the results against the original release with the one artist name substituted ---
            const artistsWithSubstitution = originalArtists.map(a => a.name === artistToCorrect.name ? { ...a, name: correctedName! } : a);
            const scoringReleaseWithSubstitution: DiscogsRelease = {
                ...release,
                basic_information: { ...release.basic_information, artists: artistsWithSubstitution, artist_display_name: formatArtistNames(artistsWithSubstitution) }
            }

            const reSearchResult = await findBestMatch(releaseForResearch, settings, parentSignal, scoringReleaseWithSubstitution);

            // --- Step D: Compare and keep the best result found so far ---
            if (reSearchResult.bestScore > bestResultSoFar.bestScore) {
                console.log(`[Apple Music] Re-search yielded a better score: ${reSearchResult.bestScore.toFixed(3)} > ${bestResultSoFar.bestScore.toFixed(3)}`);
                bestResultSoFar = reSearchResult;
            }

            // If we get a near-perfect match, we can stop early
            if (bestResultSoFar.bestScore >= 0.99) {
                console.log(`[Apple Music] Found a high-confidence match. Stopping fallback search.`);
                break;
            }
        }
    }

    // Enforce individual artist corrections on the final result.
    // If we found corrections (e.g. "Gabe 'Nandez") but the album metadata from Apple 
    // uses the old/incorrect name (e.g. "Gabe Nandez"), we overwrite it here.
    if (corrections.size > 0) {
        const improvedArtists = originalArtists.map((a, index) => ({
            ...a,
            name: corrections.get(index) || a.name
        }));
        const improvedDisplayName = formatArtistNames(improvedArtists);

        if (bestResultSoFar.bestMatch) {
             // If we have a match (even a new better one), ensure it uses our corrected names
             if (bestResultSoFar.bestMatch.artistName !== improvedDisplayName) {
                 bestResultSoFar = {
                     ...bestResultSoFar,
                     bestMatch: {
                         ...bestResultSoFar.bestMatch,
                         artistName: improvedDisplayName
                     }
                 };
                 console.log(`[Apple Music] Enforcing artist corrections on final result: "${improvedDisplayName}"`);
             }
        } else if (bestResultSoFar.bestScore < ACCEPTANCE_THRESHOLD) {
            // If still no good album match, create synthetic match with corrections
            console.log(`[Apple Music] Fallback: Album not found, but applying ${corrections.size} artist corrections: "${improvedDisplayName}"`);
            const syntheticMatch: ITunesResult = {
                wrapperType: 'collection',
                collectionType: 'Album',
                artistName: improvedDisplayName,
                collectionName: release.basic_information.title,
                primaryGenreName: 'Unknown',
                trackCount: 0,
                releaseDate: '',
                country: '',
                currency: '',
                artworkUrl100: '',
                collectionViewUrl: '',
                artistViewUrl: '',
                collectionCensoredName: release.basic_information.title,
                collectionPrice: 0,
            };

            return {
                bestMatch: syntheticMatch,
                bestScore: 0.9, // Synthetic passing score
                bestStrategy: { type: AppleSearchStrategyType.ARTIST_ONLY, query: 'Collaboration Fallback' }
            };
        }
    }

    return bestResultSoFar;
};

/**
 * The main exported function that orchestrates the entire metadata fetching process for a single release.
 */
export const fetchAppleMusicMetadata = async (
    release: DiscogsRelease, 
    settings: Settings,
    parentSignal?: AbortSignal
): Promise<AppleMusicMetadata | null> => {
    if (!release || !release.basic_information) return null;

    // --- 1. Initial Search ---
    let bestResultSoFar = await findBestMatch(release, settings, parentSignal, release);

    // --- 2. Collaboration Fallback (if necessary) ---
    const isCollaboration = release.basic_information.artists && release.basic_information.artists.length > 1;
    const shouldFallback = isCollaboration && bestResultSoFar.bestScore < ACCEPTANCE_THRESHOLD;

    if (shouldFallback) {
        bestResultSoFar = await handleCollaborationFallback(bestResultSoFar, release, settings, parentSignal);
    }

    // --- 3. Final Result Construction ---
    return processFinalResult(bestResultSoFar, release);
};