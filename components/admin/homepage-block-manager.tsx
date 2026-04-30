"use client";

import {memo, useCallback, useMemo, useState, useTransition} from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FilePenLine,
  Github,
  LayoutPanelTop,
  PencilLine,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {MarkdownContent} from "@/components/markdown-content";
import {Button} from "@/components/ui/button";
import type {HomepageBlockRow, HomepageContentRow} from "@/lib/types";
import {cn} from "@/lib/utils";

type EditableBlock = Pick<
  HomepageBlockRow,
  | "slug"
  | "title"
  | "href"
  | "description"
  | "status_label"
  | "image_data_url"
  | "col_span"
  | "row_span"
  | "sort_order"
  | "is_active"
>;

type EditableContent = Pick<HomepageContentRow, "content_key" | "title" | "markdown">;

type EditorState =
  | {
      type: "block";
      index: number | null;
      draft: EditableBlock;
    }
  | {
      type: "content";
      draft: EditableContent;
    }
  | null;

interface HomepageBlockManagerProps {
  initialBlocks: HomepageBlockRow[];
  initialContent: HomepageContentRow;
}

const createEmptyBlock = (existingBlocks: EditableBlock[]): EditableBlock => {
  const existingSlugs = new Set(existingBlocks.map((block) => block.slug));
  let nextNumber = 1;

  while (existingSlugs.has(`gateway-${String(nextNumber).padStart(2, "0")}`)) {
    nextNumber += 1;
  }

  const label = String(nextNumber).padStart(2, "0");

  return {
    slug: `gateway-${label}`,
    title: `Gateway ${label}`,
    href: "#",
    description: "",
    status_label: "Reserved",
    image_data_url: null,
    col_span: 1,
    row_span: 1,
    sort_order: existingBlocks.length,
    is_active: true,
  };
};

function getGithubHandle(href: string) {
  const match = href.match(/github\.com\/([^/?#]+)/i);
  return match?.[1] ?? "A-GW-N";
}

function BlockPreviewTile({
  block,
  className,
}: {
  block: EditableBlock;
  className?: string;
}) {
  const isGithubBlock = block.slug === "github-org";
  const showStatus = Boolean(block.status_label?.trim()) && block.status_label !== "Reserved";

  if (isGithubBlock) {
    return (
        <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f6f6f2] p-5 text-foreground shadow-[0_20px_56px_rgba(15,15,15,0.08)] dark:border-white/8 dark:bg-[#0f1012] dark:text-white dark:shadow-[0_20px_56px_rgba(0,0,0,0.34)]",
          className
        )}
      >
        <div className="absolute inset-[1px] rounded-[1.68rem] bg-[linear-gradient(165deg,rgba(255,255,255,0.92),rgba(255,255,255,0.38)_24%,rgba(255,255,255,0.08)_52%)] dark:bg-[linear-gradient(165deg,rgba(255,255,255,0.085),rgba(255,255,255,0.02)_24%,rgba(255,255,255,0)_52%)]" />
        <div className="absolute inset-[1px] rounded-[1.68rem] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.22),transparent_26%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.035),transparent_26%)]" />
        <div className="absolute inset-[1px] rounded-[1.68rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-12px_18px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-12px_18px_rgba(0,0,0,0.14)]" />
        <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />

        <div className="relative flex h-full min-h-[214px] flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[1rem] border border-black/8 bg-black/[0.02] text-foreground/72 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/72">
              <Github className="h-4 w-4" />
            </div>
            <span className="rounded-full border border-black/8 bg-black/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/40 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/40">
              Org
            </span>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="grid h-[76px] w-[76px] place-items-center rounded-[1.2rem] border border-black/8 bg-[#ecece8] text-lg font-semibold text-foreground/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/8 dark:bg-white/[0.04] dark:text-white/74 dark:shadow-none">
              {getGithubHandle(block.href).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.26em] text-foreground/34 dark:text-white/34">
                {block.title}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <h3 className="truncate text-[1.55rem] font-semibold leading-none text-foreground dark:text-white">
                  {getGithubHandle(block.href)}
                </h3>
                <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-[0.8rem] border border-black/8 bg-black/[0.02] text-foreground/66 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/66">
                  <Github className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>

          <p className="mt-auto line-clamp-3 pt-6 text-sm leading-7 text-muted-foreground dark:text-white/54">
            {block.description || "GitHub 组织入口说明将显示在这里。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f6f6f2] p-5 text-foreground shadow-[0_20px_56px_rgba(15,15,15,0.08)] dark:border-white/8 dark:bg-[#0f1012] dark:text-white dark:shadow-[0_20px_56px_rgba(0,0,0,0.34)]",
        className
      )}
    >
      <div className="absolute inset-[1px] rounded-[1.68rem] bg-[linear-gradient(165deg,rgba(255,255,255,0.92),rgba(255,255,255,0.38)_24%,rgba(255,255,255,0.08)_52%)] dark:bg-[linear-gradient(165deg,rgba(255,255,255,0.085),rgba(255,255,255,0.02)_24%,rgba(255,255,255,0)_52%)]" />
      <div className="absolute inset-[1px] rounded-[1.68rem] bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.22),transparent_26%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.035),transparent_26%)]" />
      <div className="absolute inset-[1px] rounded-[1.68rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-12px_18px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-12px_18px_rgba(0,0,0,0.14)]" />
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />

      <div className="relative flex h-full min-h-[214px] flex-col">
        <div className="flex items-center justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[1rem] border border-black/8 bg-black/[0.02] text-foreground/72 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/72">
            <LayoutPanelTop className="h-4 w-4" />
          </div>
          {showStatus ? (
            <span className="rounded-full border border-black/8 bg-black/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/40 dark:border-white/8 dark:bg-white/[0.035] dark:text-white/40">
              {block.status_label}
            </span>
          ) : null}
        </div>

        <div className="mt-auto space-y-4">
          <h3 className="line-clamp-2 text-[1.5rem] font-semibold leading-[1.08] text-foreground dark:text-white">
            {block.title}
          </h3>
          <p className="text-sm leading-7 text-muted-foreground dark:text-white/54">
            {block.description || "这里会显示该方格的简介内容。"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface BlockEditorCardProps {
  block: EditableBlock;
  index: number;
  onEdit: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}

const BlockEditorCard = memo(function BlockEditorCard({
  block,
  index,
  onEdit,
  onMove,
  onRemove,
}: BlockEditorCardProps) {
  const isGithubBlock = block.slug === "github-org";

  return (
    <article className="rounded-[1.9rem] border border-border/50 bg-background/72 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Block {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">{block.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => onEdit(index)}>
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => onMove(index, -1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => onMove(index, 1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isGithubBlock ? (
        <div className="mb-4 rounded-2xl border border-border/45 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
          GitHub 组织链接填写在这个方格里，保存时会自动同步组织头像与主页入口。
        </div>
      ) : null}

      <BlockPreviewTile block={block} />
    </article>
  );
});

function EmptyBlockPreview() {
  return (
    <div className="rounded-[1.9rem] border border-dashed border-border/55 bg-background/45 p-5 text-sm text-muted-foreground">
      暂无可用方块，点击上方 `Add Block` 新建。
    </div>
  );
}

function EditorModal({
  state,
  onClose,
  onSave,
}: {
  state: EditorState;
  onClose: () => void;
  onSave: (state: EditorState) => void;
}) {
  const [localState, setLocalState] = useState(state);

  if (!localState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md dark:bg-black/60">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[2.1rem] border border-black/8 bg-[#f7f7f2] p-6 text-foreground shadow-[0_28px_96px_rgba(15,15,15,0.16)] dark:border-white/10 dark:bg-[#111214] dark:text-white dark:shadow-[0_28px_96px_rgba(0,0,0,0.48)] sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/38 dark:text-white/38">
              {localState.type === "block" ? "Block Editor" : "Info Board Editor"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              {localState.type === "block" ? "编辑主页方格" : "编辑右侧信息板"}
            </h3>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {localState.type === "block" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.82fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Slug</span>
                <input
                  value={localState.draft.slug}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, slug: event.target.value},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Title</span>
                <input
                  value={localState.draft.title}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, title: event.target.value},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-foreground/74 dark:text-white/74">Route / URL</span>
                <input
                  value={localState.draft.href}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, href: event.target.value},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-foreground/74 dark:text-white/74">Description</span>
                <textarea
                  value={localState.draft.description}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, description: event.target.value},
                    })
                  }
                  className="min-h-32 rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Status Label</span>
                <input
                  value={localState.draft.status_label}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, status_label: event.target.value},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Active</span>
                <div className="flex items-center rounded-2xl border border-black/10 bg-white/72 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <label className="flex items-center gap-3 text-sm font-medium text-foreground/82 dark:text-white/82">
                    <input
                      type="checkbox"
                      checked={localState.draft.is_active}
                      onChange={(event) =>
                        setLocalState({
                          ...localState,
                          draft: {...localState.draft, is_active: event.target.checked},
                        })
                      }
                      className={cn("h-4 w-4 rounded border-white/20")}
                    />
                    Visible on homepage
                  </label>
                </div>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Width</span>
                <select
                  value={localState.draft.col_span}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, col_span: Number(event.target.value)},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-[#17181c] dark:text-white dark:focus:border-white/24"
                >
                  <option value={1}>1 column</option>
                  <option value={2}>2 columns</option>
                  <option value={3}>3 columns</option>
                  <option value={4}>4 columns</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Height</span>
                <select
                  value={localState.draft.row_span}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, row_span: Number(event.target.value)},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-[#17181c] dark:text-white dark:focus:border-white/24"
                >
                  <option value={1}>1 row</option>
                  <option value={2}>2 rows</option>
                  <option value={3}>3 rows</option>
                </select>
              </label>
            </div>

            <div className="rounded-[1.85rem] border border-black/10 bg-[#f1f1eb] p-5 dark:border-white/10 dark:bg-[#0d0e10]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/36 dark:text-white/36">
                Live Preview
              </p>
              <div className="mt-5">
                <BlockPreviewTile block={localState.draft} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Board Title</span>
                <input
                  value={localState.draft.title}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, title: event.target.value},
                    })
                  }
                  className="rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground/74 dark:text-white/74">Markdown</span>
                <textarea
                  value={localState.draft.markdown}
                  onChange={(event) =>
                    setLocalState({
                      ...localState,
                      draft: {...localState.draft, markdown: event.target.value},
                    })
                  }
                  className="min-h-[360px] rounded-2xl border border-black/10 bg-white/72 px-4 py-3 text-foreground outline-none transition-colors focus:border-black/24 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/24"
                />
              </label>
            </div>
            <div className="rounded-[1.85rem] border border-black/10 bg-[#f1f1eb] p-5 dark:border-white/10 dark:bg-[#0d0e10]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/36 dark:text-white/36">
                Live Preview
              </p>
              <h4 className="mt-3 text-2xl font-semibold">{localState.draft.title}</h4>
              <div className="mt-5 max-h-[480px] overflow-y-auto rounded-[1.45rem] border border-black/8 bg-white/62 p-5 dark:border-white/8 dark:bg-black/20">
                <MarkdownContent content={localState.draft.markdown} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave(localState)} className="rounded-full">
            Apply Draft
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HomepageBlockManager({
  initialBlocks,
  initialContent,
}: HomepageBlockManagerProps) {
  const [blocks, setBlocks] = useState<EditableBlock[]>(
    initialBlocks.map((block) => ({
      slug: block.slug,
      title: block.title,
      href: block.href,
      description: block.description,
      status_label: block.status_label,
      image_data_url: block.image_data_url ?? null,
      col_span: block.col_span,
      row_span: block.row_span,
      sort_order: block.sort_order,
      is_active: block.is_active,
    }))
  );
  const [content, setContent] = useState<EditableContent>({
    content_key: initialContent.content_key,
    title: initialContent.title,
    markdown: initialContent.markdown,
  });
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(null);

  const hasBlocks = useMemo(() => blocks.length > 0, [blocks.length]);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    setBlocks((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next.map((block, blockIndex) => ({
        ...block,
        sort_order: blockIndex,
      }));
    });
  }, []);

  const addBlock = useCallback(() => {
    setEditorState({
      type: "block",
      index: null,
      draft: createEmptyBlock(blocks),
    });
  }, [blocks]);

  const editBlock = useCallback(
    (index: number) => {
      setEditorState({
        type: "block",
        index,
        draft: {...blocks[index]},
      });
    },
    [blocks]
  );

  const editContent = useCallback(() => {
    setEditorState({
      type: "content",
      draft: {...content},
    });
  }, [content]);

  const applyEditorState = useCallback((state: EditorState) => {
    if (!state) {
      return;
    }

    if (state.type === "block") {
      setBlocks((current) => {
        if (state.index === null) {
          return [...current, {...state.draft, sort_order: current.length}];
        }

        return current.map((block, blockIndex) =>
          blockIndex === state.index ? {...state.draft, sort_order: blockIndex} : block
        );
      });
      setStatusMessage("方格草稿已更新，记得保存到数据库");
    } else {
      setContent(state.draft);
      setStatusMessage("信息板草稿已更新，记得保存到数据库");
    }

    setEditorState(null);
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((current) =>
      current
        .filter((_, blockIndex) => blockIndex !== index)
        .map((block, blockIndex) => ({...block, sort_order: blockIndex}))
    );
    setStatusMessage("方格已从草稿中移除，记得保存到数据库");
  }, []);

  const saveBlocks = useCallback(() => {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const payload = blocks.map((block, index) => ({
          ...block,
          sort_order: index,
          col_span: Number(block.col_span) || 1,
          row_span: Number(block.row_span) || 1,
        }));

        const response = await fetch("/api/admin/homepage-blocks", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({blocks: payload, content}),
        });

        const result = (await response.json()) as {
          blocks?: HomepageBlockRow[];
          content?: HomepageContentRow;
          message?: string;
        };

        if (!response.ok || !result.blocks || !result.content) {
          throw new Error(result.message ?? "保存失败");
        }

        setBlocks(
          result.blocks.map((block) => ({
            slug: block.slug,
            title: block.title,
            href: block.href,
            description: block.description,
            status_label: block.status_label,
            image_data_url: block.image_data_url ?? null,
            col_span: block.col_span,
            row_span: block.row_span,
            sort_order: block.sort_order,
            is_active: block.is_active,
          }))
        );
        setContent({
          content_key: result.content.content_key,
          title: result.content.title,
          markdown: result.content.markdown,
        });
        setStatusMessage("主页内容已保存到数据库");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "保存失败");
      }
    });
  }, [blocks, content]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.9rem] border border-border/50 bg-background/72 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Editor State
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            方格与信息板都在中间弹出编辑，应用草稿后，再统一保存到数据库。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={editContent} className="rounded-full">
            <FilePenLine className="mr-2 h-4 w-4" />
            Edit Info Board
          </Button>
          <Button type="button" variant="outline" onClick={addBlock} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>
          <Button type="button" onClick={saveBlocks} disabled={isPending} className="rounded-full">
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save to DB"}
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {hasBlocks ? (
            blocks.map((block, index) => (
              <BlockEditorCard
                key={`${block.slug}-${index}`}
                block={block}
                index={index}
                onEdit={editBlock}
                onMove={moveBlock}
                onRemove={removeBlock}
              />
            ))
          ) : (
            <EmptyBlockPreview />
          )}
        </div>

        <article className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Info Board
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight">{content.title}</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={editContent}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[560px] overflow-y-auto rounded-[1.55rem] border border-border/45 bg-gradient-to-b from-background/90 to-muted/20 p-5">
            <MarkdownContent
              content={content.markdown}
              className="[&_a]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground"
            />
          </div>
        </article>
      </div>

      {editorState ? (
        <EditorModal
          state={editorState}
          onClose={() => setEditorState(null)}
          onSave={applyEditorState}
        />
      ) : null}
    </div>
  );
}
