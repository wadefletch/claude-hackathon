import { anthropic } from "@ai-sdk/anthropic"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai"
import type { UIMessage } from "ai"
import { createFileRoute } from "@tanstack/react-router"

import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt"
import { agentTools } from "@/lib/agent/tools"

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages }: { messages: UIMessage[] } = await request.json()

        const result = streamText({
          model: anthropic("claude-sonnet-5"),
          system: AGENT_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          tools: agentTools,
          stopWhen: isStepCount(12),
        })

        return createUIMessageStreamResponse({
          stream: toUIMessageStream({ stream: result.stream }),
        })
      },
    },
  },
})
