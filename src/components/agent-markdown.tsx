import { Streamdown } from "streamdown"

/**
 * Renders AI SDK text parts with streaming-aware Markdown. Streamdown keeps
 * incomplete Markdown stable while tokens arrive and uses the same semantic
 * design tokens as the rest of the shadcn UI.
 */
export function AgentMarkdown({
  children,
  isStreaming = false,
}: {
  children: string
  isStreaming?: boolean
}) {
  return (
    <Streamdown
      className="min-w-0 text-sm leading-6"
      isAnimating={isStreaming}
      mode={isStreaming ? "streaming" : "static"}
      parseIncompleteMarkdown={isStreaming}
    >
      {children}
    </Streamdown>
  )
}
