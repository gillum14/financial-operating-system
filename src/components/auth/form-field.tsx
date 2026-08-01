export function FormField({
  id,
  label,
  type,
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
      />
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-[calc(var(--radius)-8px)] bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
        {state.message}
      </p>
    );
  }
  return null;
}
