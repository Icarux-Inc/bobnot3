"use server";

import { db } from "@/server/db";
import { auth } from "@/server/auth";

export async function searchContext(query: string, workspaceId: string) {
    const session = await auth();
    if (!session?.user) {
        return { error: "Unauthorized" };
    }

    // Simple ILIKE search for autocomplete
    // We could use vector search here too, but text match is often better for explicit referencing
    const pages = await db.page.findMany({
        where: {
            workspaceId,
            title: {
                contains: query,
                mode: "insensitive",
            },
        },
        take: 5,
        select: {
            id: true,
            title: true,
        },
    });

    const folders = await db.folder.findMany({
        where: {
            workspaceId,
            name: {
                contains: query,
                mode: "insensitive",
            },
        },
        take: 3,
        select: {
            id: true,
            name: true,
        },
    });

    return {
        results: [
            ...pages.map((p) => ({ id: p.id, title: p.title, type: "page" as const })),
            ...folders.map((f) => ({ id: f.id, title: f.name, type: "folder" as const })),
        ],
    };
}
