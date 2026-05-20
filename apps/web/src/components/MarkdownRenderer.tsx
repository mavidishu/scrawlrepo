import ReactMarkdown from 'react-markdown';
// @ts-expect-error - react-syntax-highlighter lacks type definitions
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-expect-error - react-syntax-highlighter lacks type definitions
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mb-4 mt-6 text-gray-900">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold mb-3 mt-5 text-gray-900">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-900">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold mb-2 mt-3 text-gray-800">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-base font-semibold mb-2 mt-3 text-gray-800">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-sm font-semibold mb-2 mt-2 text-gray-700">
            {children}
          </h6>
        ),

        // Paragraph
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-gray-800">
            {children}
          </p>
        ),

        // Code blocks with syntax highlighting
        code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: unknown }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : 'text';

          if (inline) {
            return (
              <code className="bg-gray-200 text-red-600 px-2 py-1 rounded text-sm font-mono">
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              style={atomDark}
              language={language}
              PreTag="div"
              className="rounded-lg mb-4 overflow-x-auto"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        },

        // Pre tag
        pre: ({ children }) => (
          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4 text-sm">
            {children}
          </pre>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className="ml-6 mb-3 list-disc space-y-1">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="ml-6 mb-3 list-decimal space-y-1">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li className="text-gray-800">
            {children}
          </li>
        ),

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary-600 pl-4 italic text-gray-600 my-4 bg-gray-50 py-2 pr-4 rounded">
            {children}
          </blockquote>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline hover:underline"
          >
            {children}
          </a>
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-bold text-gray-900">
            {children}
          </strong>
        ),

        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-gray-800">
            {children}
          </em>
        ),

        // Horizontal rule
        hr: () => (
          <hr className="my-4 border-t border-gray-300" />
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4 border border-gray-300 rounded-lg">
            <table className="border-collapse w-full text-sm">
              {children}
            </table>
          </div>
        ),

        thead: ({ children }) => (
          <thead className="bg-gray-100 border-b border-gray-300">
            {children}
          </thead>
        ),

        tbody: ({ children }) => (
          <tbody>{children}</tbody>
        ),

        tr: ({ children }) => (
          <tr className="border-b border-gray-300 hover:bg-gray-50">
            {children}
          </tr>
        ),

        th: ({ children }) => (
          <th className="border-r border-gray-300 px-4 py-2 text-left font-semibold text-gray-900 bg-gray-50">
            {children}
          </th>
        ),

        td: ({ children }) => (
          <td className="border-r border-gray-300 px-4 py-2 text-gray-800">
            {children}
          </td>
        ),

        // Images
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg mb-4 border border-gray-200"
          />
        ),
      }}
      className="prose-sm max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
}
