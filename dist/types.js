// --- Shared Enums ---
export var SortOption;
(function (SortOption) {
    SortOption["AddedNewest"] = "added_newest";
    SortOption["AddedOldest"] = "added_oldest";
    SortOption["ArtistAZ"] = "artist_az";
    SortOption["ArtistZA"] = "artist_za";
    SortOption["AlbumAZ"] = "album_az";
    SortOption["AlbumZA"] = "album_za";
    SortOption["YearNewest"] = "year_newest";
    SortOption["YearOldest"] = "year_oldest";
    SortOption["LabelAZ"] = "label_az";
    SortOption["LabelZA"] = "label_za";
    SortOption["FormatAZ"] = "format_az";
    SortOption["FormatZA"] = "format_za";
    SortOption["CatNoAZ"] = "catno_az";
    SortOption["CatNoZA"] = "catno_za";
    SortOption["SearchRelevance"] = "search_relevance";
})(SortOption || (SortOption = {}));
export var MetadataSourceType;
(function (MetadataSourceType) {
    MetadataSourceType["Discogs"] = "discogs";
    MetadataSourceType["Apple"] = "apple";
    MetadataSourceType["MusicBrainz"] = "musicbrainz";
})(MetadataSourceType || (MetadataSourceType = {}));
export var AppleSearchStrategyType;
(function (AppleSearchStrategyType) {
    AppleSearchStrategyType["ARTIST_PLUS_YEAR"] = "ARTIST_PLUS_YEAR";
    AppleSearchStrategyType["ALBUM_PLUS_YEAR"] = "ALBUM_PLUS_YEAR";
    AppleSearchStrategyType["ARTIST_ONLY"] = "ARTIST_ONLY";
})(AppleSearchStrategyType || (AppleSearchStrategyType = {}));
export var ReleaseType;
(function (ReleaseType) {
    ReleaseType["ALBUM"] = "Album";
    ReleaseType["SINGLE"] = "Single";
    ReleaseType["EP"] = "EP";
    ReleaseType["COMPILATION"] = "Compilation";
    ReleaseType["UNKNOWN"] = "Unknown";
})(ReleaseType || (ReleaseType = {}));
