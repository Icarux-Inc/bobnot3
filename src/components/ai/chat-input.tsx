"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import React from "react";
import { searchContext } from "@/server/actions/search";

interface ChatInputProps {
  sendMessage: (message: { text: string }) => void;
  isLoading: boolean;
  workspaceId: string;
}

export function ChatInput({ sendMessage, isLoading, workspaceId }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [atQuery, setAtQuery] = React.useState("");
  const [pages, setPages] = React.useState<{ id: string; title: string; type: "page" | "folder" }[]>([]);
  const [selectedContexts, setSelectedContexts] = React.useState<{ id: string; title: string; type: "page" | "folder" }[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Debounce search
  React.useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      void (async () => {
        const result = await searchContext(atQuery, workspaceId);
        if (result.results) {
          setPages(result.results);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [atQuery, open, workspaceId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      setOpen(true);
      setAtQuery("");
    } else if (open) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectContext = (item: { id: string; title: string; type: "page" | "folder" }) => {
    setSelectedContexts([...selectedContexts, item]);
    setOpen(false);
  };

  const handleSend = () => {
    if (!input.trim() && selectedContexts.length === 0) return;
    
    // AI SDK v5 sendMessage expects { text: string } per official docs
    sendMessage({ text: input });
    
    setInput("");
    setSelectedContexts([]);
  };

  return (
    <form onSubmit={(e) => {
        e.preventDefault();
        handleSend();
    }} className="relative flex flex-col gap-2">
      
      {/* Selected Context Chips */}
      {selectedContexts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
            {selectedContexts.map((ctx) => (
                <div key={ctx.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
                    <span className="opacity-70">{ctx.type === 'page' ? '📄' : '📁'}</span>
                    <span>{ctx.title}</span>
                    <button 
                        type="button"
                        onClick={() => setSelectedContexts(selectedContexts.filter(c => c.id !== ctx.id))}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* Popover for @ context selection */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="absolute top-0 left-0 h-0 w-0" />
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command>
            <CommandInput 
                placeholder="Search pages..." 
                value={atQuery}
                onValueChange={setAtQuery}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Pages & Folders">
                {pages.map((page) => (
                  <CommandItem
                    key={page.id}
                    onSelect={() => handleSelectContext(page)}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    {page.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI... (Type @ to add context)"
          className="min-h-[60px] w-full resize-none rounded-xl border-none bg-secondary/50 p-4 pr-12 shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || (!input.trim() && selectedContexts.length === 0)}
          className="absolute bottom-3 right-3 h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </form>
  );
}
