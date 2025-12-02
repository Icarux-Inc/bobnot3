import { db } from "@/server/db";
import { findSimilarPages } from "./jaccard";

interface Page {
    id: string;
    title: string;
    content: unknown;
}

interface ContextResult {
    currentPage: Page | null;
    recentPages: Page[];
    relatedPages: Page[];
    jaccardMatches: Page[];
    semanticMatches: Page[];
    totalTokens: number;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Convert page content to string
 */
function contentToString(content: unknown): string {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    return JSON.stringify(content);
}

/**
 * Gather comprehensive context for AI query
 * Implements Cursor-style multi-source context injection
 */
export async function gatherContext(params: {
    workspaceId: string;
    currentPageId?: string;
    recentPageIds?: string[];
    userQuery: string;
    maxTokens?: number;
}): Promise<ContextResult> {
    const {
        workspaceId,
        currentPageId,
        recentPageIds = [],
        userQuery,
        maxTokens = 50000
    } = params;

    let totalTokens = 0;
    const excludeIds = new Set<string>();

    // 1. Current page (always included, highest priority)
    let currentPage: Page | null = null;
    if (currentPageId) {
        currentPage = await db.page.findUnique({
            where: { id: currentPageId },
            select: { id: true, title: true, content: true }
        });

        if (currentPage) {
            const content = contentToString(currentPage.content);
            totalTokens += estimateTokens(currentPage.title + content);
            excludeIds.add(currentPage.id);
        }
    }

    // 2. Recently edited pages (up to 5)
    const recentPages: Page[] = [];
    if (recentPageIds.length > 0 && totalTokens < maxTokens) {
        const pages = await db.page.findMany({
            where: {
                id: { in: recentPageIds.filter(id => !excludeIds.has(id)) },
                workspaceId
            },
            select: { id: true, title: true, content: true },
            take: 5
        });

        for (const page of pages) {
            const content = contentToString(page.content);
            const tokens = estimateTokens(page.title + content);

            if (totalTokens + tokens > maxTokens) break;

            recentPages.push(page);
            totalTokens += tokens;
            excludeIds.add(page.id);
        }
    }

    // 3. Jaccard similarity matches (fast lexical matching)
    const jaccardMatches: Page[] = [];
    if (totalTokens < maxTokens) {
        const similar = await findSimilarPages({
            query: userQuery,
            workspaceId,
            limit: 5,
            threshold: 0.2,
            excludePageIds: Array.from(excludeIds)
        });

        if (similar.length > 0) {
            const pages = await db.page.findMany({
                where: {
                    id: { in: similar.map(s => s.id) }
                },
                select: { id: true, title: true, content: true }
            });

            for (const page of pages) {
                const content = contentToString(page.content);
                const tokens = estimateTokens(page.title + content);

                if (totalTokens + tokens > maxTokens) break;

                jaccardMatches.push(page);
                totalTokens += tokens;
                excludeIds.add(page.id);
            }
        }
    }

    // 4. Semantic search (embedding-based) - only if we have budget left
    const semanticMatches: Page[] = [];
    if (totalTokens < maxTokens * 0.8) { // Reserve 20% for semantic matches
        try {
            const { embedMany } = await import("ai");
            const { google } = await import("@/lib/ai/google");

            const { embeddings } = await embedMany({
                model: google.textEmbeddingModel("text-embedding-004"),
                values: [userQuery]
            });

            const queryEmbedding = embeddings[0];
            if (queryEmbedding) {
                const vectorQuery = `[${queryEmbedding.join(",")}]`;

                const pages = await db.$queryRaw<Page[]>`
          SELECT id, title, content
          FROM "Page"
          WHERE "workspaceId" = ${workspaceId}
            AND embedding IS NOT NULL
            AND id NOT IN (${Array.from(excludeIds).join(',') || 'NULL'})
          ORDER BY embedding <=> ${vectorQuery}::vector
          LIMIT 3
        `;

                for (const page of pages) {
                    const content = contentToString(page.content);
                    const tokens = estimateTokens(page.title + content);

                    if (totalTokens + tokens > maxTokens) break;

                    semanticMatches.push(page);
                    totalTokens += tokens;
                    excludeIds.add(page.id);
                }
            }
        } catch (error) {
            console.error("Semantic search failed:", error);
        }
    }

    // Combine related pages (Jaccard + Semantic)
    const relatedPages = [...jaccardMatches, ...semanticMatches];

    return {
        currentPage,
        recentPages,
        relatedPages,
        jaccardMatches,
        semanticMatches,
        totalTokens
    };
}
