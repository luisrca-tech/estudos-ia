import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type ReviewCardProps = {
  /** Where the note comes from, e.g. the module kicker. */
  context: React.ReactNode;
  /** Badges such as "atrasada" or the review step. */
  meta?: React.ReactNode;
  prompt: React.ReactNode;
  revealed: boolean;
  /** The note itself; rendered only after reveal. */
  answer?: React.ReactNode;
  /** "Revelar" before the reveal; the grading buttons after it. */
  actions: React.ReactNode;
  className?: string;
};

/** Spaced recall: the question alone first, the note only after "Revelar". */
function ReviewCard({ context, meta, prompt, revealed, answer, actions, className }: ReviewCardProps) {
  return (
    <article
      data-slot="review-card"
      data-state={revealed ? "revealed" : "hidden"}
      className={cn("rounded-md border border-line bg-surface", className)}
    >
      <div className="px-6 pt-6 pb-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{context}</p>
          {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        <p className="mt-5 font-serif text-2xl font-semibold text-balance">{prompt}</p>
      </div>
      {revealed ? (
        <div className="border-t border-line px-6 py-6 sm:px-8" aria-live="polite">
          {answer}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-sunken/60 px-6 py-4 sm:px-8">
        {actions}
      </div>
    </article>
  );
}

export { ReviewCard };
