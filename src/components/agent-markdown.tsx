import { Streamdown } from "streamdown"

/**
 * Renders AI SDK text parts with streaming-aware Markdown. Streamdown keeps
 * incomplete Markdown stable while tokens arrive and uses the same semantic
 * design tokens as the rest of the shadcn UI.
 */
export function AgentMarkdown({
  children,
  isAnimating = false,
}: {
  children: string
  isAnimating?: boolean
}) {
  return (
    <Streamdown
      animated={isAnimating}
      className="min-w-0 text-sm leading-6"
      isAnimating={isAnimating}
      mode={isAnimating ? "streaming" : "static"}
      parseIncompleteMarkdown={isAnimating}
    >
      {children}
    </Streamdown>
  )
}
