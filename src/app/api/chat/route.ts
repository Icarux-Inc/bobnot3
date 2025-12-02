import { google } from "@/lib/ai/google";
import { streamText, convertToCoreMessages, type UIMessage } from "ai";
import { createPage, listFolder, readPage, searchWorkspace, listAllPages } from "@/server/ai/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      messages: UIMessage[];
      workspaceId: string;
      currentPageId?: string;
      recentPageIds?: string[];
    };
    const { messages, workspaceId, currentPageId, recentPageIds } = body;

    console.log("Input messages:", JSON.stringify(messages, null, 2));

    // Get user's last message for context gathering
    const lastMessage = messages[messages.length - 1];
    let userQuery = '';

    if (lastMessage && 'parts' in lastMessage) {
      const textPart = lastMessage.parts.find((p: unknown) =>
        typeof p === 'object' && p !== null && 'type' in p && p.type === 'text'
      );
      if (textPart && typeof textPart === 'object' && 'text' in textPart) {
        userQuery = String(textPart.text);
      }
    }

    // Gather comprehensive context
    const { gatherContext } = await import("@/server/ai/context");
    const context = await gatherContext({
      workspaceId,
      currentPageId,
      recentPageIds,
      userQuery,
    });

    // Helper to convert content to string
    const contentToStr = (content: unknown): string => {
      if (typeof content === 'string') return content;
      if (!content) return '';
      return JSON.stringify(content);
    };

    // Build context sections
    const currentPageContext = context.currentPage
      ? `📄 **Current Page: "${context.currentPage.title}"**\n${contentToStr(context.currentPage.content)}\n`
      : '';

    const recentPagesContext = context.recentPages.length > 0
      ? `📂 **Recently Edited:**\n${context.recentPages.map(p => `- ${p.title}`).join('\n')}\n`
      : '';

    const relatedPagesContext = context.relatedPages.length > 0
      ? `🔍 **Related Pages:**\n${context.relatedPages.map(p => `- ${p.title}`).join('\n')}\n`
      : '';

    const systemPrompt = `You are the "Operator," a hyper-competent AI partner integrated into the user's workspace (ID: ${workspaceId}).
Your goal is to help the user think, plan, and execute.

**CURRENT CONTEXT:**
${currentPageContext}${recentPagesContext}${relatedPagesContext}

**CORE DIRECTIVES:**
1.  **Context is King:** You have access to the user's workspace. Always ground your answers in the provided context. If you don't know, say "I don't see that in your notes," rather than hallucinating.
2.  **Be Proactive:** Don't just answer; suggest the next step. If the user asks "What's on my plate?", summarize tasks AND offer to create a "Daily Plan" page.
3.  **Action-Oriented:** You have tools. Use them. If the user wants to "save this," use the create_page tool.
4.  **Maintain Hierarchy:** Understand that pages live in folders. When creating content, ask where it should go if it's ambiguous, or infer the best location based on context.
5.  **Tool Usage:**
    - **listAllPages:** Use this when the user asks "what pages do I have" or "what are my projects". This tool lists all pages in the workspace.
    - **searchWorkspace:** You MUST provide both 'query' and 'workspaceId'. Use this for semantic search when you need to find specific content.
    - **listFolder:** You MUST provide a 'folderId'.

**TONE:**
Crisp, professional, slightly informal but highly efficient. Think "Chief of Staff."`;

    console.log(`Context gathered: ${context.totalTokens} tokens`);

    // Define tools
    const tools = {
      searchWorkspace,
      readPage,
      createPage,
      listFolder,
      listAllPages,
    };

    // Wrap tools to inject workspaceId
    const wrappedTools: any = {};
    for (const [name, tool] of Object.entries(tools)) {
      wrappedTools[name] = {
        ...tool,
        execute: async (args: any, context: any) => {
          console.log(`[Wrapper] Executing ${name} with args:`, JSON.stringify(args));
          // Inject workspaceId if missing and required
          if (['listAllPages', 'searchWorkspace', 'createPage'].includes(name) && !args.workspaceId) {
            console.log(`[Wrapper] Injecting workspaceId for ${name}`);
            args.workspaceId = workspaceId;
          }
          try {
            const result = await tool.execute(args, context);
            console.log(`[Wrapper] ${name} executed successfully. Result keys:`, Object.keys(result));
            return result;
          } catch (error) {
            console.error(`[Wrapper] Error executing ${name}:`, error);
            throw error;
          }
        }
      };
    }

    // Use streamText with maxSteps to handle tool execution automatically
    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: convertToCoreMessages(messages),
      system: systemPrompt,
      tools: wrappedTools,
      maxSteps: 5,
      onStepFinish: (step) => {
        console.log(`Step finished. Tool calls: ${step.toolCalls.length}`);
        if (step.toolCalls.length > 0) {
          console.log('Tool calls:', JSON.stringify(step.toolCalls, null, 2));
        }
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('❌ Fatal error in chat route:', error);

    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
