import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const COLORS = [
    "#FF5733", // Red
    "#33FF57", // Green
    "#3357FF", // Blue
    "#F1C40F", // Yellow
    "#9B59B6", // Purple
    "#E67E22", // Orange
    "#1ABC9C", // Teal
    "#E91E63", // Pink
];

function getUserColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Get the room from the request body
    const { room } = await request.json();

    if (!room) {
        return new Response("Missing room", { status: 400 });
    }

    // Check access
    let hasAccess = false;
    
    // Assume room format "page-{id}"
    if (room.startsWith("page-")) {
        const pageId = room.replace("page-", "");
        const page = await db.page.findUnique({
            where: { id: pageId },
            include: { workspace: true, collaborators: true }
        });
        
        if (page) {
            if (page.workspace.ownerId === session.user.id) {
                hasAccess = true;
            } else if (page.collaborators.some(c => c.id === session.user.id)) {
                hasAccess = true;
            }
        }
    }

    if (!hasAccess) {
         return new Response("Forbidden", { status: 403 });
    }

    // Get the current user's info
    const user = {
        id: session.user.id,
        info: {
            name: session.user.name || "Anonymous",
            email: session.user.email || "",
            avatar: session.user.image || "",
            color: getUserColor(session.user.id),
        },
    };

    // Create a session for the current user
    const liveSession = liveblocks.prepareSession(user.id, {
        userInfo: user.info,
    });

    // Give the user access to the room
    liveSession.allow(room, liveSession.FULL_ACCESS);

    // Authorize the user and return the result
    const { status, body } = await liveSession.authorize();
    return new Response(body, { status });
}
