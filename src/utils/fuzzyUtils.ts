export const getLevenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', '&', 'of', 'in', 'on', 'at']);

// Tokenizer for SCORING: Strips ALL non-alphanumeric characters to match "Guns N' Roses" vs "Guns N Roses".
export const tokenize = (str: string): string[] => {
    if (!str) return [];
    const cleaned = str.toLowerCase()
        .replace(/\s\(\d+\)$/, '') // Remove Discogs suffix like " (2)"
        .trim();
    
    return cleaned.split(/\s+/)
        .map(t => t.replace(/[^a-z0-9]/g, '')) // Strip ALL non-alphanumeric characters from each token.
        .filter(t => t.length > 0 && !STOP_WORDS.has(t)); // Filter out stop words
};

// Cleaner for SEARCHING: Preserves punctuation (like 'Til) but removes Discogs garbage
export const cleanForSearch = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/\s\(\d+\)$/, '') // Remove Discogs suffix
        .replace(/\s+/g, ' ')      // Normalize spaces
        .trim();
};

/**
 * Calculates a similarity score between two strings based on word-by-word Levenshtein distance.
 * This version is more symmetrical and handles strings of different lengths more reliably
 * by penalizing for unmatched words.
 */
export const calculateFuzzyScore = (strA: string, strB: string): number => {
    const wordsA = tokenize(strA);
    const wordsB = tokenize(strB);

    if (wordsA.length === 0 && wordsB.length === 0) return 1;
    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    let totalScore = 0;

    // For each word in A, find the BEST match in B
    wordsA.forEach(wordA => {
        let maxWordSimilarity = 0;

        wordsB.forEach(wordB => {
            const distance = getLevenshteinDistance(wordA, wordB);
            const maxLength = Math.max(wordA.length, wordB.length);
            const similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength);
            
            if (similarity > maxWordSimilarity) {
                maxWordSimilarity = similarity;
            }
        });

        totalScore += maxWordSimilarity;
    });

    // The score is the average similarity of words in A, but is penalized by any
    // words in B that weren't matched (by using the max length as the denominator).
    // This makes the score more symmetrical and better for comparing strings of different lengths,
    // preventing a short string from getting a perfect score against a long string it's only a subset of.
    const denominator = Math.max(wordsA.length, wordsB.length);
    return totalScore / denominator;
};