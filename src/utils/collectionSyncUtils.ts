
import type { DiscogsRelease } from '../types';

/**
 * Compares two release objects to see if their data has changed.
 * We focus on the fields that affect display or logic in the app.
 */
export function areReleasesEqual(a: DiscogsRelease, b: DiscogsRelease): boolean {
  if (a.instance_id !== b.instance_id) return false;
  if (a.id !== b.id) return false;
  if (a.date_added !== b.date_added) return false;
  
  // Check Basic Information
  const infoA = a.basic_information;
  const infoB = b.basic_information;

  if (infoA.title !== infoB.title) return false;
  if (infoA.year !== infoB.year) return false;
  if (infoA.artist_display_name !== infoB.artist_display_name) return false;
  if (infoA.cover_image !== infoB.cover_image) return false;

  // Check Formats (length and basic properties)
  if ((infoA.formats?.length || 0) !== (infoB.formats?.length || 0)) return false;
  if (JSON.stringify(infoA.formats) !== JSON.stringify(infoB.formats)) return false;

  return true;
}

/**
 * Merges a new page of releases into the existing collection.
 * 
 * - Updates existing items if they are found in the incoming page (e.g. re-fetches).
 * - Appends new items that are not currently in the collection.
 * - Preserves object references for unchanged items to optimize React rendering.
 */
export function mergePageIntoCollection(
  currentCollection: DiscogsRelease[],
  incomingPage: DiscogsRelease[]
): { merged: DiscogsRelease[]; hasChanges: boolean } {
  const currentMap = new Map(currentCollection.map(item => [item.instance_id, item]));
  let hasChanges = false;

  // 1. Update existing items if they appear in the new page
  const updatedCurrent = currentCollection.map(existingItem => {
    const incomingItem = incomingPage.find(i => i.instance_id === existingItem.instance_id);
    
    if (incomingItem) {
        // The item exists in both. Check if it needs updating.
        if (!areReleasesEqual(existingItem, incomingItem)) {
            hasChanges = true;
            return incomingItem;
        }
        return existingItem;
    }
    return existingItem;
  });

  // 2. Find truly new items in the incoming page that weren't in current collection
  const newItems = incomingPage.filter(incomingItem => !currentMap.has(incomingItem.instance_id));
  
  if (newItems.length > 0) {
      hasChanges = true;
  }

  // 3. Combine
  const merged = [...updatedCurrent, ...newItems];

  return { merged, hasChanges };
}