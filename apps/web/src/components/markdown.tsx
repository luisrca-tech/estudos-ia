import { Prose } from "@estudos-ia/ui/components/prose";
import type { Route } from "next";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const baseComponents: Components = {
  a: ({ href, children }) => {
    if (href?.startsWith("/")) {
      return <Link href={href as Route}>{children}</Link>;
    }
    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
};

const inlineComponents: Components = {
  ...baseComponents,
  p: ({ children }) => <>{children}</>,
};

type MarkdownProps = {
  children: string;
  /** One-line content (list items, labels): no paragraph wrapper, inherits the parent's type. */
  inline?: boolean;
  className?: string;
};

/** Renders user and content Markdown (GFM). External links open in a new tab. */
export function Markdown({ children, inline, className }: MarkdownProps) {
  return (
    <Prose inline={inline} className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={inline ? inlineComponents : baseComponents}>
        {children}
      </ReactMarkdown>
    </Prose>
  );
}
