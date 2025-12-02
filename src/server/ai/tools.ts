/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { z } from "zod";
import { db } from "@/server/db";
import { google } from "@/lib/ai/google";
import { tool, embed, embedMany } from "ai";

const searchParams = z.object({
    query: z.string().describe("The search query."),
    workspaceId: z.string().describe("The ID of the workspace to search in."),
});

export const searchWorkspace = tool({
    description: "Search the workspace for relevant pages and folders using semantic search.",
    parameters: searchParams,
    execute: async (args: z.infer<typeof searchParams>) => {
        const { query, workspaceId } = args;
        console.log("searchWorkspace called with args:", JSON.stringify(args, null, 2));

        if (!query || query.trim() === "") {
            return { error: "Search query cannot be empty. Please provide a search term." };
        }

        try {
            console.log("Generating embedding for query:", query);
            // Generate embedding for the query
            const { embeddings } = await embedMany({
                model: google.textEmbeddingModel("text-embedding-004"),
                values: [query],
            });

            const embedding = embeddings[0];
            if (!embedding) {
                return { error: "Failed to generate embedding." };
            }

            // Perform vector search using raw SQL
            const vectorQuery = `[${embedding.join(",")}]`;

            // Search Pages
            const pages = await db.$queryRaw`
        SELECT id, title, "workspaceId", "folderId"
        FROM "Page"
        WHERE "workspaceId" = ${workspaceId}
        ORDER BY embedding <=> ${vectorQuery}::vector
        LIMIT 5;
      `;

            // Search Folders
            const folders = await db.$queryRaw`
        SELECT id, name, "workspaceId", "parentId"
        FROM "Folder"
        WHERE "workspaceId" = ${workspaceId}
        ORDER BY embedding <=> ${vectorQuery}::vector
        LIMIT 3;
      `;

            return { pages, folders };
        } catch (error: unknown) {
            console.error("Search failed:", error);
            return { error: "Failed to perform search." };
        }
    },
} as any);

const readPageParams = z.object({
    pageId: z.string().describe("The ID of the page to read."),
});

export const readPage = tool({
    description: "Read the full content of a specific page.",
    parameters: readPageParams,
    execute: async ({ pageId }: z.infer<typeof readPageParams>) => {
        const page = await db.page.findUnique({
            where: { id: pageId },
        });

        if (!page) {
            return { error: "Page not found." };
        }

        return {
            id: page.id,
            title: page.title,
            content: page.content
        };
    },
} as any);

const createPageParams = z.object({
    title: z.string().describe("The title of the new page."),
    content: z.string().describe("The initial content of the page (markdown or text)."),
    workspaceId: z.string().describe("The ID of the workspace."),
    folderId: z.string().optional().describe("The ID of the parent folder (optional)."),
});

export const createPage = tool({
    description: "Create a new page in the workspace.",
    parameters: createPageParams,
    execute: async ({ title, content, workspaceId, folderId }: z.infer<typeof createPageParams>) => {
        try {
            const newPage = await db.page.create({
                data: {
                    title,
                    content: content, // Storing as simple string/json for now
                    workspaceId,
                    folderId,
                },
            });

            // Generate embedding
            try {
                const { embeddings } = await embedMany({
                    model: google.textEmbeddingModel("text-embedding-004"),
                    values: [title + "\n" + content],
                });
                const embedding = embeddings[0];

                if (embedding) {
                    const vectorQuery = `[${embedding.join(",")}]`;
                    await db.$executeRaw`
                        UPDATE "Page"
                        SET embedding = ${vectorQuery}::vector
                        WHERE id = ${newPage.id}
                    `;
                    console.log(`Generated embedding for page: ${title}`);
                }
            } catch (embedError) {
                console.error("Failed to generate embedding for new page:", embedError);
                // We don't fail the page creation if embedding fails
            }

            return { success: true, pageId: newPage.id, message: `Page '${title}' created.` };
        } catch (error: unknown) {
            return { error: "Failed to create page." };
        }
    },
} as any);

const listFolderParams = z.object({
    folderId: z.string().describe("The ID of the folder."),
});

export const listFolder = tool({
    description: "List the contents (pages and subfolders) of a specific folder.",
    parameters: listFolderParams,
    execute: async (args: z.infer<typeof listFolderParams>) => {
        const { folderId } = args;
        if (!folderId) {
            return { error: "Folder ID is required." };
        }

        const folder = await db.folder.findUnique({
            where: { id: folderId },
            include: {
                pages: { select: { id: true, title: true } },
                children: { select: { id: true, name: true } },
            },
        });

        if (!folder) {
            return { error: "Folder not found." };
        }

        return {
            id: folder.id,
            name: folder.name,
            pages: folder.pages,
            subfolders: folder.children,
        };
    },
} as any);

const listAllPagesParams = z.object({
    workspaceId: z.string().describe("The ID of the workspace."),
});

export const listAllPages = tool({
    description: "List all pages in the workspace. Use this when the user asks 'what pages do I have' or 'what are my projects'.",
    parameters: listAllPagesParams,
    execute: async (args: z.infer<typeof listAllPagesParams>) => {
        const { workspaceId } = args;

        const pages = await db.page.findMany({
            where: { workspaceId },
            select: {
                id: true,
                title: true,
                folderId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        });

        return {
            pages: pages.map(p => ({
                id: p.id,
                title: p.title,
                folderId: p.folderId,
                lastUpdated: p.updatedAt.toISOString(),
            })),
            total: pages.length,
        };
    },
} as any);
