import type { DiscogsRelease } from '../types';
/**
 * Compares two release objects to see if their data has changed.
 * We focus on the fields that affect display or logic in the app.
 */
export declare function areReleasesEqual(a: DiscogsRelease, b: DiscogsRelease): boolean;
/**
 * Merges a new page of releases into the existing collection.
 *
 * - Updates existing items if they are found in the incoming page (e.g. re-fetches).
 * - Appends new items that are not currently in the collection.
 * - Preserves object references for unchanged items to optimize React rendering.
 */
export declare function mergePageIntoCollection(currentCollection: DiscogsRelease[], incomingPage: DiscogsRelease[]): {
    merged: DiscogsRelease[];
    hasChanges: boolean;
};
