import type { DiscogsRelease, ServiceMetadata } from '../../types';
export declare const fetchMusicBrainzMetadata: (release: DiscogsRelease, signal?: AbortSignal) => Promise<ServiceMetadata | null>;
