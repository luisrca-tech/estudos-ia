import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { Alert } from "./alert";
import { Button } from "./button";

type ErrorStateProps = {
  /** What failed, in plain words. */
  title: React.ReactNode;
  /** How to fix it. */
  children?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
};

function ErrorState({ title, children, onRetry, className }: ErrorStateProps) {
  return (
    <Alert
      tone="danger"
      title={title}
      className={cn(className)}
      actions={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar de novo
          </Button>
        ) : undefined
      }
    >
      {children}
    </Alert>
  );
}

export { ErrorState };
