"use client";

import * as React from "react";
import {
  ResizablePanel,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X } from "lucide-react";
import { ChatInput } from "./chat-input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type ImperativePanelHandle } from "react-resizable-panels";

interface AiSidebarProps {
  defaultCollapsed?: boolean;
  workspaceId: string;
  currentPageId?: string; // Current page being viewed/edited
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    args: unknown;
  };
}

export function AiSidebar({ defaultCollapsed = true, workspaceId, currentPageId }: AiSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const panelRef = React.useRef<ImperativePanelHandle>(null);
  
  // Get recent pages from session tracker
  const getRecentPageIds = React.useCallback(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('bobnot3:recentPages');
      if (!stored) return [];
      
      const recent = JSON.parse(stored);
      return Array.isArray(recent) ? recent.slice(0, 5).map((p: { id: string }) => p.id) : [];
    } catch {
      return [];
    }
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        workspaceId,
        currentPageId,
        recentPageIds: getRecentPageIds(),
      },
    }),
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  console.log("Current messages:", messages);
  console.log("Current status:", status);

  // Trigger batch embedding when sidebar opens
  React.useEffect(() => {
    if (!isCollapsed) {
      fetch('/api/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
        .then(res => res.json())
        .then(data => console.log('Batch embedding:', data))
        .catch(err => console.error('Batch embedding failed:', err));
    }
  }, [isCollapsed, workspaceId]);

  // Keyboard shortcut: Ctrl+Q to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        
        // Toggle using panel ref
        if (panelRef.current) {
          if (isCollapsed) {
            panelRef.current.expand();
          } else {
            panelRef.current.collapse();
          }
        }
        setIsCollapsed((prev: boolean) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  return (
    <ResizablePanel
      ref={panelRef}
      defaultSize={isCollapsed ? 0 : 25}
      minSize={20}
      maxSize={40}
      collapsible={true}
      collapsedSize={0}
      onCollapse={() => setIsCollapsed(true)}
      onExpand={() => setIsCollapsed(false)}
      className={`border-l bg-background transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-0 min-w-0 border-l-0" : ""
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Assistant
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col gap-1 ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.parts && message.parts.length > 0 ? (
                    message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return <span key={index}>{part.text}</span>;
                      }
                      if (part.type === "tool-invocation") {
                        const toolPart = part as unknown as ToolInvocationPart;
                        return (
                          <div key={index} className="flex items-center gap-2 text-xs opacity-70">
                            <Sparkles className="h-3 w-3" />
                            <span>Using {toolPart.toolInvocation.toolName}...</span>
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <span>{message.content}</span>
                  )}
                </div>
              </div>
            ))}
            {status === "streaming" && (
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Sparkles className="h-3 w-3 animate-pulse" />
                 Thinking...
               </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <ChatInput
            sendMessage={sendMessage}
            isLoading={status !== "ready"}
            workspaceId={workspaceId}
          />
        </div>
      </div>
    </ResizablePanel>
  );
}
