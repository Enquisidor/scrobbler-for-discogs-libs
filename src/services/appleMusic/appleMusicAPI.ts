
import type { ITunesResponse } from '../../types';

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds per request

/**
 * A dedicated utility for making raw fetch requests to the Apple Music (iTunes) Search API.
 * It handles URL construction, timeouts, and JSON parsing.
 */
export const fetchFromAppleMusic = async (
    strategyQuery: string,
    entity: 'album' | 'musicArtist' | undefined,
    omitEntity: boolean,
    attribute: 'artistTerm' | 'albumTerm' | undefined,
    offset: number,
    parentSignal: AbortSignal | undefined
): Promise<ITunesResponse> => {
    const pageRequestController = new AbortController();
    const timeoutId = setTimeout(() => pageRequestController.abort(), REQUEST_TIMEOUT_MS);

    const onParentAbort = () => pageRequestController.abort();
    if (parentSignal) parentSignal.addEventListener('abort', onParentAbort);

    try {
        const encodedQuery = encodeURIComponent(strategyQuery);
        let url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&limit=200&offset=${offset}`;
        if (entity) url += `&entity=${entity}`;
        else if (!omitEntity) url += `&entity=album`;
        if (attribute) url += `&attribute=${attribute}`;

        const response = await fetch(url, { signal: pageRequestController.signal });

        if (!response.ok) {
            // Throw an error that can be caught to stop pagination for this strategy.
            throw new Error(`Apple Music API responded with status ${response.status}`);
        }

        return await response.json() as ITunesResponse;
    } catch (e) {
        // Re-throw AbortError to be handled by the service, otherwise log and re-throw a generic error.
        if (e instanceof DOMException && e.name === 'AbortError') {
             if (parentSignal?.aborted) {
                // This was a parent-initiated abort, propagate it.
                throw new DOMException('Aborted by parent', 'AbortError');
            }
            // This was a timeout. Log it and let the service decide how to proceed.
            console.warn(`[Apple Music API] Request timed out for query: "${strategyQuery}"`);
        }
        // Re-throw to be handled by the calling function.
        throw e;
    } finally {
        clearTimeout(timeoutId);
        if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    }
};
