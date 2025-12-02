import { NextResponse } from "next/server";
import { markPageAsStale } from "@/server/ai/embeddings";

export async function POST(req: Request) {
    try {
        const { pageId } = await req.json();

        if (!pageId) {
            return NextResponse.json(
                { error: "pageId is required" },
                { status: 400 }
            );
        }

        await markPageAsStale(pageId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mark stale error:", error);
        return NextResponse.json(
            { error: "Failed to mark page as stale" },
            { status: 500 }
        );
    }
}
