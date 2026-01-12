import type { DiscogsRelease, CombinedMetadata, Settings } from '../types';
export declare function applyMetadataCorrections(rawCollection: DiscogsRelease[], allMetadata: Record<number, CombinedMetadata>, settings: Settings): DiscogsRelease[];
