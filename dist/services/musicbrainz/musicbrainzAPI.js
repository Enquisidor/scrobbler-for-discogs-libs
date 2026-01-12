const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT = 'VinylScrobbler/1.0 ( https://github.com/your-repo/vinyl-scrobbler )'; // Replace with real info
export const fetchFromMusicBrainz = async (query, signal) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onParentAbort = () => controller.abort();
    if (signal)
        signal.addEventListener('abort', onParentAbort);
    try {
        const encodedQuery = encodeURIComponent(query);
        // We fetch releases based on the query. fmt=json is required.
        const url = `https://musicbrainz.org/ws/2/release/?query=${encodedQuery}&fmt=json`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`MusicBrainz API responded with status ${response.status}`);
        }
        return await response.json();
    }
    catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            if (signal?.aborted) {
                throw new DOMException('Aborted by parent', 'AbortError');
            }
            console.warn(`[MusicBrainz API] Request timed out for query: "${query}"`);
        }
        throw e;
    }
    finally {
        clearTimeout(timeoutId);
        if (signal)
            signal.removeEventListener('abort', onParentAbort);
    }
};
