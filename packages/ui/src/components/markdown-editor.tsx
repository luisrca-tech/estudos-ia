"use client";

import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs";
import { Textarea } from "./textarea";

type MarkdownEditorProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Renders the Markdown preview; the app owns the Markdown renderer. */
  renderPreview: (value: string) => React.ReactNode;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
};

/** Plain Markdown textarea with a preview tab. */
function MarkdownEditor({
  id,
  value,
  onValueChange,
  renderPreview,
  placeholder,
  maxLength,
  invalid,
  describedBy,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = React.useState<"write" | "preview">("write");

  return (
    <Tabs
      data-slot="markdown-editor"
      value={tab}
      onValueChange={(next) => setTab(next as "write" | "preview")}
      className={cn("gap-3", className)}
    >
      <div className="flex items-end justify-between gap-4">
        <TabsList className="flex-1">
          <TabsTab value="write">Escrever</TabsTab>
          <TabsTab value="preview">Pré-visualizar</TabsTab>
        </TabsList>
        {maxLength ? (
          <span className="pb-2 text-xs text-muted-foreground tabular-nums">
            {value.length.toLocaleString("pt-BR")} / {maxLength.toLocaleString("pt-BR")}
          </span>
        ) : null}
      </div>
      <TabsPanel value="write" keepMounted>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          spellCheck
          className="min-h-80 py-3 font-mono text-sm leading-relaxed"
        />
      </TabsPanel>
      <TabsPanel value="preview">
        <div className="min-h-80 rounded-sm border border-line bg-surface px-5 py-4">
          {value.trim() ? (
            renderPreview(value)
          ) : (
            <p className="text-muted-foreground">Nada para pré-visualizar ainda. Escreva na aba Escrever.</p>
          )}
        </div>
      </TabsPanel>
    </Tabs>
  );
}

export { MarkdownEditor };
