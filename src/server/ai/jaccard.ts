import { db } from "@/server/db";

/**
 * Calculate Jaccard similarity coefficient between two sets
 * Formula: |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Tokenize text into normalized words
 * - Lowercase
 * - Remove punctuation
 * - Split on whitespace
 * - Filter out common stop words
 */
export function tokenize(text: string): Set<string> {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
        'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    return new Set(words);
}

interface SimilarPage {
    id: string;
    title: string;
    similarity: number;
}

/**
 * Find pages similar to the query using Jaccard similarity
 * Fast lexical matching for autocomplete-style suggestions
 */
export async function findSimilarPages(params: {
    query: string;
    workspaceId: string;
    limit?: number;
    threshold?: number;
    excludePageIds?: string[];
}): Promise<SimilarPage[]> {
    const {
        query,
        workspaceId,
        limit = 5,
        threshold = 0.2,
        excludePageIds = []
    } = params;

    // Tokenize query
    const queryTokens = tokenize(query);
    if (queryTokens.size === 0) return [];

    // Fetch all pages in workspace (title only for speed)
    const pages = await db.page.findMany({
        where: {
            workspaceId,
            id: { notIn: excludePageIds }
        },
        select: {
            id: true,
            title: true,
        }
    });

    // Calculate similarity for each page
    const results: SimilarPage[] = pages
        .map(page => {
            const pageTokens = tokenize(page.title);
            const similarity = jaccardSimilarity(queryTokens, pageTokens);

            return {
                id: page.id,
                title: page.title,
                similarity
            };
        })
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return results;
}
