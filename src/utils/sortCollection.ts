
import type { DiscogsRelease, SortOption } from '../types';
import { SortOption as SortOptionEnum } from '../types'; // Enum import for use in switch
import { calculateFuzzyScore } from './fuzzyUtils';

export function sortCollection(collection: DiscogsRelease[], sortOption: SortOption, searchTerm: string = ''): DiscogsRelease[] {
  const sorted = [...collection]; // Create a shallow copy to avoid mutating the original array

  if (sortOption === SortOptionEnum.SearchRelevance && searchTerm) {
    const term = searchTerm.toLowerCase();
    const getScore = (release: DiscogsRelease): number => {
      let score = 0;
      const info = release.basic_information;
      const title = info.title.toLowerCase();
      const artist = info.artist_display_name.toLowerCase();

      // Exact match bonus
      if (title.includes(term)) score += 1.0;
      if (artist.includes(term)) score += 0.8;
      
      // Fuzzy Score
      const fuzzyTitle = calculateFuzzyScore(term, title);
      const fuzzyArtist = calculateFuzzyScore(term, artist);
      
      // Add fuzzy score (0 to 1) to total
      score += Math.max(fuzzyTitle, fuzzyArtist);

      return score;
    };
    sorted.sort((a, b) => getScore(b) - getScore(a));
    return sorted;
  }

  sorted.sort((a, b) => {
    const infoA = a.basic_information;
    const infoB = b.basic_information;
    switch (sortOption) {
      case SortOptionEnum.ArtistAZ: return infoA.artist_display_name.localeCompare(infoB.artist_display_name);
      case SortOptionEnum.ArtistZA: return infoB.artist_display_name.localeCompare(infoA.artist_display_name);
      case SortOptionEnum.AlbumAZ: return infoA.title.localeCompare(infoB.title);
      case SortOptionEnum.AlbumZA: return infoB.title.localeCompare(infoA.title);
      case SortOptionEnum.YearNewest: return (infoB.year || 0) - (infoA.year || 0);
      case SortOptionEnum.YearOldest: return (infoA.year || 0) - (infoB.year || 0);
      case SortOptionEnum.AddedNewest: return b.instance_id - a.instance_id;
      case SortOptionEnum.AddedOldest: return a.instance_id - b.instance_id;
      case SortOptionEnum.LabelAZ: return (infoA.labels?.[0]?.name || '').localeCompare(infoB.labels?.[0]?.name || '');
      case SortOptionEnum.LabelZA: return (infoB.labels?.[0]?.name || '').localeCompare(infoA.labels?.[0]?.name || '');
      case SortOptionEnum.FormatAZ: return (infoA.formats?.[0]?.name || '').localeCompare(infoB.formats?.[0]?.name || '');
      case SortOptionEnum.FormatZA: return (infoB.formats?.[0]?.name || '').localeCompare(infoA.formats?.[0]?.name || '');
      case SortOptionEnum.CatNoAZ: return (infoA.labels?.[0]?.catno || '').localeCompare(infoB.labels?.[0]?.catno || '');
      case SortOptionEnum.CatNoZA: return (infoB.labels?.[0]?.catno || '').localeCompare(infoA.labels?.[0]?.catno || '');
      default: return 0;
    }
  });
  return sorted;
}