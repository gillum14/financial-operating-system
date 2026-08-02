import { z } from "zod";

import { ValidationError } from "@/domains/errors";

// The one approved way for a Server Action to validate input. Throws a
// ValidationError carrying structured per-field messages (via Zod's
// z.flattenError) instead of ever returning `error.issues`/`error.message`
// from a ZodError to the caller — those are not a stable or safe public
// contract (field paths, internal Zod codes, etc.).
export function parseAction<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    throw new ValidationError("Validation failed", fieldErrors as Record<string, string[]>);
  }
  return result.data;
}
