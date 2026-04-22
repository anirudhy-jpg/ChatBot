import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy, FiCheck } from "react-icons/fi";

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains("dark");

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
    <div className="group relative mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 z-20 hidden items-center gap-1 rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:bg-slate-700 group-hover:flex"
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
          style={isDark ? oneDark : oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            backgroundColor: "transparent",
            margin: 0,
            padding: "1rem",
            borderRadius: 0,
          }}
          className="text-[13px] leading-6"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold mb-2 mt-3">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>
        ),

        p: ({ children }) => (
          <p className="text-[13px] leading-5 mb-2">{children}</p>
        ),

        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-2 space-y-1 text-[13px]">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-2 space-y-1 text-[13px]">
            {children}
          </ol>
        ),

        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");

          if (!inline && match) {
            return <CodeBlock code={code} language={match[1]} />;
          }

          return (
            <code className="px-1 py-0.5 rounded-md text-[12px] font-mono bg-slate-200/70 text-slate-800 dark:bg-slate-700/50 dark:text-slate-200">
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
