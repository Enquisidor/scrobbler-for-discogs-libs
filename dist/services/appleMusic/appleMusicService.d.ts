import type { DiscogsRelease, Settings } from '../../types';
import type { AppleMusicMetadata } from '../../types';
/**
 * The main exported function that orchestrates the entire metadata fetching process for a single release.
 */
export declare const fetchAppleMusicMetadata: (release: DiscogsRelease, settings: Settings, parentSignal?: AbortSignal) => Promise<AppleMusicMetadata | null>;
