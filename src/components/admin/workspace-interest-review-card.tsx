"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/fetcher";

type WorkspaceInterestReviewCardProps = {
  request: {
    id: string;
    type: string;
    status: string;
    source: string;
    requestCount: number;
    updatedAt: string;
    lastRequestedAt: string;
    workspaceName: string;
    requesterName: string;
    requesterEmail: string;
    notes: string | null;
  };
};

function prettify(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function WorkspaceInterestReviewCard({ request }: WorkspaceInterestReviewCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [notes, setNotes] = useState(request.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  const saveReview = useMutation({
    mutationFn: () =>
      apiFetch<{ request: { status: string; notes: string | null; updatedAt: string } }>(
        `/api/admin/workspace-interests/${request.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            notes
          })
        }
      ),
    onSuccess: (response) => {
      setStatus(response.request.status);
      setNotes(response.request.notes ?? "");
      setFeedback("Saved follow-up status.");
      router.refresh();
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to update this request.");
    }
  });

  return (
    <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{request.workspaceName}</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">{request.type.toUpperCase()}</Badge>
          <Badge>{prettify(status)}</Badge>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {request.requesterName} · {request.requesterEmail}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Source: {request.source} · Requested {request.requestCount} time{request.requestCount === 1 ? "" : "s"} · Last signal{" "}
        {formatDateTime(request.lastRequestedAt)}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_140px]">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-[1rem] border border-border bg-white px-3 text-sm outline-none transition focus:border-[#00b0ff]"
        >
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Internal notes for support follow-up, next steps, or context."
          className="min-h-[92px]"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={saveReview.isPending}
            onClick={() => {
              setFeedback(null);
              saveReview.mutate();
            }}
          >
            {saveReview.isPending ? "Saving..." : "Save review"}
          </Button>
          <p className="text-xs text-muted-foreground">Updated {formatDateTime(request.updatedAt)}</p>
        </div>
      </div>

      {feedback ? <p className="mt-2 text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
