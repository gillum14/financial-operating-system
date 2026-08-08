"use client";

import { Archive as ArchiveIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { archiveMission } from "@/features/missions/actions";
import { useServerAction } from "@/lib/actions/use-action";

export function ArchiveMissionButton({ missionId, title }: { missionId: string; title: string }) {
  const router = useRouter();
  const archive = useServerAction(archiveMission);

  function handleArchive() {
    if (!window.confirm(`Archive "${title}"? It will be hidden from your active/completed lists but never deleted.`)) return;
    archive.run({ missionId }, () => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={archive.isPending}
      aria-label={`Archive ${title}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-60"
    >
      <ArchiveIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}
