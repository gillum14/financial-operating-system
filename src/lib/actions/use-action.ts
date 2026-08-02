"use client";

import { useState, useTransition } from "react";

import type { ActionError, ActionResult } from "./types";

// The one client-side calling convention for every executeAction()-backed
// Server Action in this codebase. These actions take a parsed object and
// return ActionResult<T>, not the (prevState, formData) shape React's own
// useActionState expects — this hook adapts that into pending/error state
// a form component can render directly, without each form re-inventing
// the same startTransition/try-catch boilerplate.
export function useServerAction<Input, Output>(action: (input: Input) => Promise<ActionResult<Output>>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<ActionError | null>(null);

  function run(input: Input, onSuccess?: (data: Output) => void) {
    setError(null);
    // React 19's startTransition accepts an async function directly —
    // isPending stays true for the whole await, not just the sync tick.
    startTransition(async () => {
      const result = await action(input);
      if (result.success) {
        onSuccess?.(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  function reset() {
    setError(null);
  }

  return { run, isPending, error, reset };
}
