import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { pageId } = await params;
    const json = await req.json() as { content?: string; title?: string };

    const page = await db.page.findUnique({
        where: { id: pageId },
        include: { workspace: true, collaborators: true }
    });

    const isOwner = page?.workspace.ownerId === session.user.id;
    const isCollaborator = page?.collaborators.some(c => c.id === session.user.id);

    if (!page || (!isOwner && !isCollaborator)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const updatedPage = await db.page.update({
        where: { id: pageId },
        data: {
            content: json.content ?? undefined,
            title: json.title ?? undefined,
        },
    });

    return NextResponse.json(updatedPage);
}
