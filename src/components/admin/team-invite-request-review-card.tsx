"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/fetcher";

type TeamInviteRequestReviewCardProps = {
  request: {
    id: string;
    status: string;
    source: string;
    requestCount: number;
    requestedSeatCount: number;
    inviteEmails: string[];
    message: string | null;
    notes: string | null;
    updatedAt: string;
    lastRequestedAt: string;
    workspaceName: string;
    requesterName: string;
    requesterEmail: string;
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

export function TeamInviteRequestReviewCard({ request }: TeamInviteRequestReviewCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [notes, setNotes] = useState(request.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  const saveReview = useMutation({
    mutationFn: () =>
      apiFetch<{ request: { status: string; notes: string | null; updatedAt: string } }>(
        `/api/admin/team-invite-requests/${request.id}`,
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
      setFeedback("Saved invite-request follow-up.");
      router.refresh();
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to update this Team invite request.");
    }
  });

  return (
    <div className="rounded-[1rem] border border-border bg-white/88 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{request.workspaceName}</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-white text-[hsl(var(--foreground))] shadow-none">TEAM INVITE</Badge>
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

      <div className="mt-3 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border/80 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested seats</p>
          <p className="mt-1 text-sm font-semibold">{request.requestedSeatCount}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Invite emails</p>
          <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">{request.inviteEmails.join(", ")}</p>
        </div>
      </div>

      {request.message ? (
        <div className="mt-3 rounded-2xl border border-border/80 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Request context</p>
          <p className="mt-1 text-sm text-[hsl(var(--foreground))]">{request.message}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_140px]">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-[1rem] border border-border bg-white px-3 text-sm outline-none transition focus:border-[#00b0ff]"
        >
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="closed">Closed</option>
        </select>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Internal notes for team rollout follow-up, expected seats, or launch timing."
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
