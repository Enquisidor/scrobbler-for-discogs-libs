import type { DiscogsRelease, ITunesResult, AppleSearchStrategy, Settings } from '../../types';
import { ReleaseType } from '../../types';
export declare function getDiscogsReleaseType(release: DiscogsRelease): ReleaseType;
export declare function getAppleReleaseType(result: ITunesResult): ReleaseType;
export declare function getScores(discogs: DiscogsRelease, apple: ITunesResult): {
    artistScore: number;
    albumScore: number;
};
/**
 * Extracts a best-effort label name from a copyright string.
 * e.g., "℗ 2023 Capitol Records, LLC" -> "Capitol Records"
 */
export declare function extractLabelFromCopyright(copyright: string | undefined): string;
/**
 * Calculates a score based on how well an Apple Music result matches a Discogs release.
 * The score validates the metadata field the user wants to correct, based on settings.
 */
export declare function calculateTruthScore(discogs: DiscogsRelease, apple: ITunesResult, strategy: AppleSearchStrategy, settings: Settings): number;
/**
 * Determines if a new result is a better match than the current best result,
 * assuming they have the same primary score. This is a tie-breaker.
 */
export declare function isBetterTieBreak(discogs: DiscogsRelease, newResult: ITunesResult, currentBestResult: ITunesResult, settings: Settings): boolean;
