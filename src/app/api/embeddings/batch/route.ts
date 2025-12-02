import { NextResponse } from "next/server";
import { getStalePages, batchGenerateEmbeddings } from "@/server/ai/embeddings";

export async function POST(req: Request) {
    try {
        const { workspaceId } = await req.json();

        if (!workspaceId) {
            return NextResponse.json(
                { error: "workspaceId is required" },
                { status: 400 }
            );
        }

        // Get up to 10 stale pages
        const stalePages = await getStalePages(workspaceId, 10);

        if (stalePages.length === 0) {
            return NextResponse.json({ processed: 0, message: "No stale pages found" });
        }

        // Batch generate embeddings
        const processed = await batchGenerateEmbeddings(stalePages);

        return NextResponse.json({
            processed,
            message: `Successfully embedded ${processed} pages`
        });
    } catch (error) {
        console.error("Batch embedding error:", error);
        return NextResponse.json(
            { error: "Failed to process embeddings" },
            { status: 500 }
        );
    }
}
