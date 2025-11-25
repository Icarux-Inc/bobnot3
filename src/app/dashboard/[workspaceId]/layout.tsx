import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { GalleryVerticalEnd } from "lucide-react";
import { Inter } from "next/font/google";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const { workspaceId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    redirect("/dashboard");
  }

  const isOwner = workspace.ownerId === session.user.id;
  let treeItems: any[] = [];

  if (isOwner) {
      const allFolders = await db.folder.findMany({
        where: { workspaceId: workspaceId },
        include: { 
          pages: {
            orderBy: { order: 'asc' }
          } 
        },
        orderBy: { order: 'asc' }
      });
      
      const rootPages = await db.page.findMany({
        where: { workspaceId: workspaceId, folderId: null },
        orderBy: { order: 'asc' }
      });

      const folderMap = new Map<string, any>();
      
      allFolders.forEach(f => {
        folderMap.set(f.id, { 
          id: f.id, 
          name: f.name, 
          type: 'folder', 
          children: [],
          isOpen: false
        });
      });

      allFolders.forEach(f => {
        const folderNode = folderMap.get(f.id);
        f.pages.forEach(p => {
          folderNode.children.push({
            id: p.id,
            name: p.title,
            type: 'page'
          });
        });
      });

      allFolders.forEach(f => {
        const node = folderMap.get(f.id);
        if (f.parentId && folderMap.has(f.parentId)) {
          folderMap.get(f.parentId).children.push(node);
        } else {
          treeItems.push(node);
        }
      });

      rootPages.forEach(p => {
        treeItems.push({
          id: p.id,
          name: p.title,
          type: 'page'
        });
      });
  } else {
      const sharedPages = await db.page.findMany({
          where: {
              workspaceId: workspaceId,
              collaborators: { some: { id: session.user.id } }
          },
          orderBy: { order: 'asc' }
      });

      if (sharedPages.length === 0) {
          redirect("/dashboard");
      }

      treeItems = sharedPages.map(p => ({
          id: p.id,
          name: p.title,
          type: 'page'
      }));
  }

  // Fetch pages shared with me from OTHER workspaces
  const otherSharedPages = await db.page.findMany({
      where: {
          collaborators: { some: { id: session.user.id } },
          workspaceId: { not: workspaceId }
      },
      include: {
          workspace: true
      },
      orderBy: { updatedAt: 'desc' }
  });

  const formattedSharedPages = otherSharedPages.map(p => ({
      id: p.id,
      title: p.title,
      workspaceId: p.workspaceId,
      workspaceName: p.workspace.name
  }));

  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "user@example.com",
    avatar: session.user.image ?? "",
  };

  const workspaces = [
    {
      name: workspace.name,
      plan: "Enterprise",
    },
  ];

  // Default breadcrumb items
  const breadcrumbItems = [
    { label: workspace.name, href: `/dashboard/${workspaceId}` },
  ];

  return (
    <div className={`${inter.variable} font-sans`}>
      <SidebarProvider>
        <AppSidebar 
          workspaceId={workspaceId} 
          items={treeItems} 
          user={user}
          workspaces={workspaces}
          isOwner={isOwner}
          sharedPages={formattedSharedPages}
        />
        <SidebarInset>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
