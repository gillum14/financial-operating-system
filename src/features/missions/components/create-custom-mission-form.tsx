"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createCustomMission } from "@/features/missions/actions";
import { useServerAction } from "@/lib/actions/use-action";

// The one user-confirmed mission type in the system (missions-specification.md
// §7) — created directly as Active, since there's no real-data eligibility
// check to run first (see MissionService.createCustomMission). Filling out
// and submitting this form is both "create/save" and "start" in one step;
// afterward it behaves exactly like any other active mission (shows in
// Active Missions, can be archived) except its only completion path is the
// explicit "Mark Complete" action, never automatic evaluation.
export function CreateCustomMissionForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  const create = useServerAction(createCustomMission);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;

    create.run({ title: title.trim(), description: description.trim() }, () => {
      setTitle("");
      setDescription("");
      router.refresh();
      onDone();
    });
  }

  return (
    <form className="space-y-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="custom-mission-title" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Title
        </label>
        <input
          id="custom-mission-title"
          type="text"
          required
          maxLength={120}
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Cancel unused subscriptions"
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="custom-mission-description" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Description
        </label>
        <textarea
          id="custom-mission-description"
          required
          maxLength={500}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What does completing this mean, and how will you know it's done?"
          className="w-full resize-none rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <p className="text-xs text-[var(--foreground-muted)]">
        Athena can&apos;t verify a custom mission automatically — you&apos;ll mark it complete yourself.
      </p>

      {create.error && (
        <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {create.error.message}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onDone}
          className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {create.isPending ? "Starting..." : "Create & Start Mission"}
        </button>
      </div>
    </form>
  );
}
