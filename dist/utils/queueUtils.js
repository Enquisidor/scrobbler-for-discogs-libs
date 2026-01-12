import { MetadataSourceType } from '../types';
import { formatArtistNames, getDisplayArtistName, getSmartArtistDisplay } from './formattingUtils';
export function isVariousArtist(name) {
    if (!name)
        return false;
    const lower = name.toLowerCase().trim();
    return lower === 'various' || lower === 'various artists';
}
export function getReleaseDisplayArtist(release, metadata, settings) {
    if (!release.basic_information)
        return '';
    return getSmartArtistDisplay(release.basic_information.artists, metadata, settings);
}
export function getReleaseDisplayTitle(release, metadata, settings) {
    if (!metadata || !settings || settings.albumSource === MetadataSourceType.Discogs) {
        return release.basic_information.title;
    }
    const sourceMeta = settings.albumSource === MetadataSourceType.Apple ? metadata.apple : metadata.musicbrainz;
    return sourceMeta?.album || release.basic_information.title;
}
export function getTrackDisplayArtist(track, release, metadata, settings, useTrackArtist = true) {
    const releaseMetadata = metadata ? metadata[release.id] : undefined;
    const albumArtistName = getReleaseDisplayArtist(release, releaseMetadata, settings);
    if (!useTrackArtist)
        return albumArtistName;
    // For tracks, we also want to validate names if we have metadata, 
    // but typically metadata is Album-level. 
    // However, we can try to validate against the Album Artist string if it's a match,
    // otherwise fallback to standard formatting.
    if (isVariousArtist(albumArtistName) && track.artists?.length) {
        return formatArtistNames(track.artists);
    }
    return albumArtistName;
}
export function getTrackFeaturedArtists(track) {
    if (!track.extraartists)
        return '';
    const featArtists = track.extraartists.filter(a => a.role.toLowerCase().includes('feat'));
    if (featArtists.length === 0)
        return '';
    return `feat. ${formatArtistNames(featArtists)}`;
}
export function getTrackCreditsStructured(track) {
    if (!track.extraartists?.length)
        return [];
    const creditArtists = track.extraartists.filter(a => !a.role.toLowerCase().includes('feat'));
    if (creditArtists.length === 0)
        return [];
    const roleMap = new Map();
    creditArtists.forEach(artist => {
        if (!roleMap.has(artist.role))
            roleMap.set(artist.role, []);
        roleMap.get(artist.role).push(artist);
    });
    return Array.from(roleMap.entries()).map(([role, artists]) => ({ role, artists }));
}
const parseDuration = (durationStr) => {
    if (!durationStr)
        return 180;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
        return parts[0] * 60 + parts[1];
    return 180;
};
export function calculateScrobbleTimestamps(queue, selectedTracks, currentTime, timeOffset) {
    const timestamps = {};
    const tracksForTimestamping = queue.flatMap(release => {
        const selectedKeys = selectedTracks[release.instanceKey];
        if (!selectedKeys?.size || !release.tracklist)
            return [];
        const sortedKeys = Array.from(selectedKeys).sort((a, b) => {
            const [aP, aS] = a.split('-').map(Number);
            const [bP, bS] = b.split('-').map(Number);
            if (aP !== bP)
                return aP - bP;
            return (aS ?? -1) - (bS ?? -1);
        });
        return sortedKeys.flatMap(key => {
            const [pIndex, sIndex] = key.split('-').map(Number);
            const parentTrack = release.tracklist[pIndex];
            const track = sIndex >= 0 ? parentTrack?.sub_tracks?.[sIndex] : parentTrack;
            if (!track)
                return [];
            return { instanceKey: release.instanceKey, trackKey: key, durationInSeconds: parseDuration(track.duration) };
        });
    });
    if (tracksForTimestamping.length === 0)
        return {};
    const totalDuration = tracksForTimestamping.reduce((acc, track) => acc + track.durationInSeconds, 0);
    let currentTimestamp = (currentTime + timeOffset) - totalDuration;
    tracksForTimestamping.forEach(({ instanceKey, trackKey, durationInSeconds }) => {
        if (!timestamps[instanceKey])
            timestamps[instanceKey] = {};
        timestamps[instanceKey][trackKey] = currentTimestamp;
        currentTimestamp += durationInSeconds;
    });
    return timestamps;
}
export function prepareTracksForScrobbling(queue, selectedTracks, artistSelections, metadataMap, timeOffset, settings) {
    const now = Math.floor(Date.now() / 1000);
    const tracksWithInfo = queue.flatMap(release => {
        const selectedKeys = selectedTracks[release.instanceKey];
        if (!selectedKeys?.size || !release.tracklist)
            return [];
        const sortedKeys = Array.from(selectedKeys).sort((a, b) => {
            const [aP, aS] = a.split('-').map(Number);
            const [bP, bS] = b.split('-').map(Number);
            if (aP !== bP)
                return aP - bP;
            return (aS ?? -1) - (bS ?? -1);
        });
        const metadata = metadataMap[release.id];
        return sortedKeys.flatMap(key => {
            const [pIndex, sIndex] = key.split('-').map(Number);
            const parentTrack = release.tracklist[pIndex];
            const track = sIndex >= 0 ? parentTrack?.sub_tracks?.[sIndex] : parentTrack;
            if (!track)
                return [];
            const selectedArtistNames = artistSelections[release.instanceKey]?.[key] || new Set();
            const allPotentialArtists = [...(track.artists || []), ...(track.extraartists || [])];
            // Filter artists based on user selection
            const finalArtists = allPotentialArtists.filter(a => selectedArtistNames.has(getDisplayArtistName(a.name)));
            let artistString = '';
            if (finalArtists.length > 0) {
                // If specific artists are selected (e.g. "feat. X"), we format them.
                // NOTE: We do not currently apply metadata correction to Track Artists because metadata is Album-level.
                // We rely on Discogs data here.
                artistString = formatArtistNames(finalArtists);
            }
            else {
                // Fallback to Release Artist (which DOES use metadata/smart display)
                artistString = getReleaseDisplayArtist(release, metadata, settings);
            }
            return {
                artist: artistString,
                track: track.title,
                album: getReleaseDisplayTitle(release, metadata, settings),
                durationInSeconds: parseDuration(track.duration),
            };
        });
    });
    if (tracksWithInfo.length === 0)
        return [];
    const totalDuration = tracksWithInfo.reduce((acc, track) => acc + track.durationInSeconds, 0);
    let currentTimestamp = (now + timeOffset) - totalDuration;
    return tracksWithInfo.map(trackInfo => {
        const timestamp = currentTimestamp;
        currentTimestamp += trackInfo.durationInSeconds;
        return { ...trackInfo, timestamp };
    });
}
