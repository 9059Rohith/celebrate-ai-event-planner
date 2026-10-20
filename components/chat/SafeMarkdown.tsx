"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
export default function SafeMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ href, children }) =>
          href?.startsWith("https://") ? (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
        img: () => null,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
