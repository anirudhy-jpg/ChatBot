import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy, FiCheck } from "react-icons/fi";

const CODE_HINT_PATTERN =
  /(^|\n)\s*(import\s.+from\s+["']|export\s+(default\s+)?|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|function\s+\w+\s*\(|async\s+function\s+\w+\s*\(|class\s+\w+|interface\s+\w+|type\s+\w+\s*=|<\w+[\s>]|SELECT\s+.+\s+FROM\s+)/im;

const looksLikeCodeBlock = (content: string) => {
  const trimmed = content.trim();

  if (!trimmed || trimmed.includes("```")) {
    return false;
  }

  if (!trimmed.includes("\n")) {
    return false;
  }

  const hasCodeHints = CODE_HINT_PATTERN.test(trimmed);
  const hasStructuredSyntax =
    /[{};<>]/.test(trimmed) &&
    /(:|=>|\breturn\b|\bconsole\.)/.test(trimmed);

  return hasCodeHints || hasStructuredSyntax;
};

const normalizeMarkdownContent = (content: string) => {
  if (!looksLikeCodeBlock(content)) {
    return content;
  }

  return `\`\`\`\n${content.trim()}\n\`\`\``;
};

const hasBlockContent = (children: React.ReactNode) =>
  React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      typeof child.type === "string" &&
      ["div", "pre", "ul", "ol", "table", "blockquote", "hr"].includes(
        child.type,
      ),
  );

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d1117] text-slate-100 shadow-[0_12px_32px_rgba(2,6,23,0.28)]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#161b22] px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] text-slate-400">
        <span>{language || "code"}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-2 z-20 flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-800"
        aria-label="Copy code"
      >
        {copied ? (
          <>
            <FiCheck size={14} /> Copied
          </>
        ) : (
          <>
            <FiCopy size={14} /> Copy
          </>
        )}
      </button>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          wrapLongLines={false}
          customStyle={{
            backgroundColor: "transparent",
            margin: 0,
            padding: "1rem 1.25rem 1.25rem",
            borderRadius: 0,
            fontSize: "13px",
            lineHeight: "1.65",
            fontFamily:
              '"SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                '"SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            },
          }}
          lineProps={{
            style: {
              background: "transparent",
              border: 0,
            },
          }}
          className="text-[13px]"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const MarkdownRenderer = ({ content }: { content: string }) => {
  const normalizedContent = normalizeMarkdownContent(content);

  return (
    <div className="space-y-3 text-[14px] leading-7 text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 text-lg font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 text-base font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-semibold">{children}</h3>
          ),

          p: ({ children }) => (
            hasBlockContent(children) ? (
              <div className="mb-3 text-[14px] leading-7">{children}</div>
            ) : (
              <p className="mb-3 text-[14px] leading-7">{children}</p>
            )
          ),

          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-6 text-[14px] leading-7">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-6 text-[14px] leading-7">
              {children}
            </ol>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-slate-300/90 pl-4 text-slate-700 dark:border-slate-600 dark:text-slate-300">
              {children}
            </blockquote>
          ),

          hr: () => (
            <hr className="my-3 border-t border-slate-300 dark:border-slate-600" />
          ),

          code({ className, children }: any) {
            const code = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className || "");
            const isBlockCode = Boolean(match) || code.includes("\n");

            if (isBlockCode) {
              return <CodeBlock code={code} language={match?.[1] ?? "text"} />;
            }

            return (
              <code className="rounded-md border border-slate-300/70 bg-slate-100 px-1.5 py-0.5 text-[12px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100">
                {children}
              </code>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
