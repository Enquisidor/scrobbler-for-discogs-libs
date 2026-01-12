export declare const getLevenshteinDistance: (a: string, b: string) => number;
export declare const tokenize: (str: string) => string[];
export declare const cleanForSearch: (str: string) => string;
/**
 * Calculates a similarity score between two strings based on word-by-word Levenshtein distance.
 * This version is more symmetrical and handles strings of different lengths more reliably
 * by penalizing for unmatched words.
 */
export declare const calculateFuzzyScore: (strA: string, strB: string) => number;
