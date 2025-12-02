import { db } from "@/server/db";
import { google } from "@/lib/ai/google";
import { embedMany } from "ai";
import crypto from "crypto";

/**
 * Generate MD5 hash of page content for change detection
 */
export function generateContentHash(title: string, content: string): string {
    return crypto
        .createHash("md5")
        .update(title + "\n" + content)
        .digest("hex");
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const { embeddings } = await embedMany({
        model: google.textEmbeddingModel("text-embedding-004"),
        values: [text],
    });

    return embeddings[0] ?? [];
}

/**
 * Batch generate embeddings for multiple pages
 * Updates database with embeddings and metadata
 */
export async function batchGenerateEmbeddings(pages: Array<{
    id: string;
    title: string;
    content: unknown;
}>): Promise<number> {
    if (pages.length === 0) return 0;

    try {
        // Prepare texts for embedding
        const texts = pages.map(page => {
            const contentStr = typeof page.content === 'string'
                ? page.content
                : JSON.stringify(page.content);
            return `${page.title}\n${contentStr}`;
        });

        // Generate embeddings in batch
        const { embeddings } = await embedMany({
            model: google.textEmbeddingModel("text-embedding-004"),
            values: texts,
        });

        // Update database
        const updates = pages.map(async (page, index) => {
            const embedding = embeddings[index];
            if (!embedding) return;

            const contentStr = typeof page.content === 'string'
                ? page.content
                : JSON.stringify(page.content);
            const contentHash = generateContentHash(page.title, contentStr);
            const vectorQuery = `[${embedding.join(",")}]`;

            await db.$executeRaw`
        UPDATE "Page"
        SET 
          embedding = ${vectorQuery}::vector,
          "contentHash" = ${contentHash},
          "lastEmbeddedAt" = NOW()
        WHERE id = ${page.id}
      `;
        });

        await Promise.all(updates);
        console.log(`✅ Batch embedded ${pages.length} pages`);
        return pages.length;
    } catch (error) {
        console.error("❌ Batch embedding failed:", error);
        return 0;
    }
}

/**
 * Get pages that need embedding (stale or never embedded)
 */
export async function getStalePages(
    workspaceId: string,
    limit: number = 10
): Promise<Array<{ id: string; title: string; content: unknown }>> {
    const pages = await db.page.findMany({
        where: {
            workspaceId,
            OR: [
                { lastEmbeddedAt: null }, // Never embedded
                {
                    AND: [
                        { lastEmbeddedAt: { not: null } },
                        { updatedAt: { gt: db.page.fields.lastEmbeddedAt } } // Updated after last embed
                    ]
                }
            ]
        },
        select: {
            id: true,
            title: true,
            content: true,
        },
        take: limit,
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return pages;
}

/**
 * Mark a page as stale (needs re-embedding)
 */
export async function markPageAsStale(pageId: string): Promise<void> {
    await db.page.update({
        where: { id: pageId },
        data: { lastEmbeddedAt: null }
    });
}
