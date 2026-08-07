import ReactMarkdown from "react-markdown"

import { cn } from "@/lib/utils"

/**
 * Renders the agent's markdown responses (bold, headings, lists, horizontal
 * rules) as real block/inline elements instead of raw `**`/`##` text. Uses
 * inherited text color throughout so it reads correctly on both the
 * assistant's muted bubble and the user's primary-colored one.
 */
export function AgentMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ className, ...props }) => (
          <p className={cn("leading-6 last:mb-0", className)} {...props} />
        ),
        h1: ({ className, ...props }) => (
          <h2
            className={cn("mt-3 mb-1 text-base font-semibold first:mt-0", className)}
            {...props}
          />
        ),
        h2: ({ className, ...props }) => (
          <h3
            className={cn("mt-3 mb-1 text-sm font-semibold first:mt-0", className)}
            {...props}
          />
        ),
        h3: ({ className, ...props }) => (
          <h4
            className={cn("mt-3 mb-1 text-sm font-semibold first:mt-0", className)}
            {...props}
          />
        ),
        strong: ({ className, ...props }) => (
          <strong className={cn("font-semibold", className)} {...props} />
        ),
        ul: ({ className, ...props }) => (
          <ul className={cn("list-disc space-y-1 pl-5", className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol
            className={cn("list-decimal space-y-1 pl-5", className)}
            {...props}
          />
        ),
        li: ({ className, ...props }) => (
          <li className={cn("leading-6", className)} {...props} />
        ),
        hr: ({ className, ...props }) => (
          <hr className={cn("my-3 border-current/15", className)} {...props} />
        ),
        a: ({ className, ...props }) => (
          <a
            className={cn("underline underline-offset-2", className)}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
