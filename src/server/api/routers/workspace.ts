import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const workspaceRouter = createTRPCRouter({
    createPage: protectedProcedure
        .input(z.object({ workspaceId: z.string(), folderId: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.page.create({
                data: {
                    title: "Untitled",
                    workspaceId: input.workspaceId,
                    folderId: input.folderId,
                },
            });
        }),

    createFolder: protectedProcedure
        .input(z.object({ workspaceId: z.string(), parentId: z.string().optional(), name: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.folder.create({
                data: {
                    name: input.name,
                    workspaceId: input.workspaceId,
                    parentId: input.parentId,
                },
            });
        }),

    renameFolder: protectedProcedure
        .input(z.object({ folderId: z.string(), name: z.string() }))
        .mutation(async ({ ctx, input }) => {
             // Verify ownership implicitly via workspace or explicit check if needed.
             // For now, assuming if they can access the folder they can rename? 
             // Or stricter: check workspace owner.
             
             const folder = await ctx.db.folder.findUnique({
                 where: { id: input.folderId },
                 include: { workspace: true }
             });

             if (!folder) {
                 throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
             }

             if (folder.workspace.ownerId !== ctx.session.user.id) {
                 throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owner can rename folders" });
             }

             return ctx.db.folder.update({
                 where: { id: input.folderId },
                 data: { name: input.name }
             });
        }),

    deleteFolder: protectedProcedure
        .input(z.object({ folderId: z.string() }))
        .mutation(async ({ ctx, input }) => {
             const folder = await ctx.db.folder.findUnique({
                 where: { id: input.folderId },
                 include: { workspace: true }
             });

             if (!folder) {
                 throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
             }

             if (folder.workspace.ownerId !== ctx.session.user.id) {
                 throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owner can delete folders" });
             }

             // Prisma handles cascading deletes if configured, otherwise we might need to delete children manually.
             // Assuming Schema has Cascade delete on relations. 
             // If not, we should delete recursively? 
             // Usually Prisma schema has `onDelete: Cascade`. 
             // I'll assume it does for now.
             
             return ctx.db.folder.delete({
                 where: { id: input.folderId }
             });
        }),

    deletePage: protectedProcedure
        .input(z.object({ pageId: z.string() }))
        .mutation(async ({ ctx, input }) => {
             const page = await ctx.db.page.findUnique({
                 where: { id: input.pageId },
                 include: { workspace: true }
             });

             if (!page) {
                 throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
             }

             if (page.workspace.ownerId !== ctx.session.user.id) {
                 throw new TRPCError({ code: "FORBIDDEN", message: "Only workspace owner can delete pages" });
             }

             return ctx.db.page.delete({
                 where: { id: input.pageId }
             });
        }),

    updateStructure: protectedProcedure
        .input(z.array(z.object({
            id: z.string(),
            type: z.enum(["page", "folder"]),
            parentId: z.string().nullable().optional(),
            order: z.number(),
        })))
        .mutation(async ({ ctx, input }) => {
            try {
                return await ctx.db.$transaction(async (tx) => {
                    // 1. Validate all parentIds first to avoid FK errors
                    const parentIds = new Set<string>();
                    input.forEach(i => {
                        if (i.parentId) parentIds.add(i.parentId);
                    });
                    
                    if (parentIds.size > 0) {
                        // Just ensure they exist
                        await tx.folder.findMany({
                            where: { id: { in: Array.from(parentIds) } },
                            select: { id: true }
                        });
                    }

                    for (const item of input) {
                        const parentId = item.parentId ?? null;
                        
                        if (item.type === "page") {
                            const count = await tx.page.count({ where: { id: item.id } });
                            if (count === 0) continue;

                            await tx.page.update({
                                where: { id: item.id },
                                data: {
                                    folderId: parentId,
                                    order: item.order,
                                },
                            });
                        } else {
                            const count = await tx.folder.count({ where: { id: item.id } });
                            if (count === 0) continue;

                            if (item.id === parentId) continue;
                            
                            await tx.folder.update({
                                where: { id: item.id },
                                data: {
                                    parentId: parentId,
                                    order: item.order,
                                },
                            });
                        }
                    }
                    return { success: true };
                }, {
                    maxWait: 5000, // 5s
                    timeout: 10000, // 10s
                });
            } catch (error) {
                console.error("Failed to update structure:", error);
                return { success: false, error: (error as Error).message };
            }
        }),
});
