import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {cn} from "@/lib/utils";

interface MarkdownContentProps {
  className?: string;
  content: string;
}

export function MarkdownContent({className, content}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "space-y-4 text-sm leading-7 text-foreground",
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-white",
        "[&_blockquote]:border-l [&_blockquote]:border-black/12 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground dark:[&_blockquote]:border-white/14 dark:[&_blockquote]:text-white/56",
        "[&_code]:rounded-md [&_code]:bg-black/[0.04] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.92em] dark:[&_code]:bg-white/[0.06]",
        "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:text-foreground dark:[&_h1]:text-white",
        "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-foreground dark:[&_h2]:text-white",
        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:text-foreground dark:[&_h3]:text-white",
        "[&_hr]:border-black/10 dark:[&_hr]:border-white/10",
        "[&_li]:ml-5 [&_li]:list-disc",
        "[&_ol]:ml-5 [&_ol]:list-decimal",
        "[&_p]:text-muted-foreground dark:[&_p]:text-white/74",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-black/8 [&_pre]:bg-black/[0.04] [&_pre]:p-4 dark:[&_pre]:border-white/8 dark:[&_pre]:bg-black/25",
        "[&_strong]:font-semibold [&_strong]:text-foreground dark:[&_strong]:text-white",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-2xl",
        "[&_td]:border [&_td]:border-black/8 [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-white/8",
        "[&_th]:border [&_th]:border-black/8 [&_th]:bg-black/[0.04] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left dark:[&_th]:border-white/8 dark:[&_th]:bg-white/[0.05]",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
