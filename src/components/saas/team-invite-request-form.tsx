"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/fetcher";

type TeamInviteRequestFormProps = {
  source: string;
  initialRequest?: {
    id: string;
    status: string;
    pipelineStage: string | null;
    requestCount: number;
    requestedSeatCount: number;
    inviteEmails: string[];
    message: string | null;
    updatedAt: string;
  } | null;
  compact?: boolean;
};

function parseEmails(value: string) {
  return [...new Set(value.split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function prettify(value: string) {
  return value.replaceAll("_", " ");
}

export function TeamInviteRequestForm({ source, initialRequest, compact = false }: TeamInviteRequestFormProps) {
  const [requestedSeatCount, setRequestedSeatCount] = useState<number | "">(initialRequest?.requestedSeatCount ?? 3);
  const [inviteEmailsText, setInviteEmailsText] = useState(initialRequest?.inviteEmails.join("\n") ?? "");
  const [message, setMessage] = useState(initialRequest?.message ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  const parsedEmails = useMemo(() => parseEmails(inviteEmailsText), [inviteEmailsText]);

  const requestInvite = useMutation({
    mutationFn: () =>
      apiFetch<{
        request: {
          id: string;
          status: string;
          requestCount: number;
          requestedSeatCount: number;
          inviteEmails: string[];
          updatedAt: string;
        };
      }>("/api/workspace/team-invite-requests", {
        method: "POST",
        body: JSON.stringify({
          requested_seat_count: Number(requestedSeatCount),
          invite_emails: parsedEmails,
          message,
          source
        })
      }),
    onSuccess: (response) => {
      setFeedback(
        response.request.requestCount > 1
          ? "Updated your Team invite request."
          : "Saved your Team invite request."
      );
      setRequestedSeatCount(response.request.requestedSeatCount);
      setInviteEmailsText(response.request.inviteEmails.join("\n"));
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to save your Team invite request.");
    }
  });

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-border/80 bg-white/92 p-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Team invite request</p>
        <h4 className="text-lg font-semibold text-[hsl(var(--foreground))]">Tell us who you plan to invite</h4>
        <p className="text-sm leading-7 text-muted-foreground">
          Share the first seats and emails you want in this workspace. We will use this to prioritize Team rollout and
          prepare the initial invite flow.
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "" : "lg:grid-cols-[160px_minmax(0,1fr)]"}`}>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-[hsl(var(--foreground))]">Requested seats</span>
          <Input
            type="number"
            min={2}
            max={50}
            value={requestedSeatCount}
            onChange={(event) => setRequestedSeatCount(event.target.value === "" ? "" : Number(event.target.value))}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-[hsl(var(--foreground))]">Invite emails</span>
          <Textarea
            value={inviteEmailsText}
            onChange={(event) => setInviteEmailsText(event.target.value)}
            className="min-h-[120px]"
            placeholder={"one@example.com\nsecond@example.com"}
          />
          <p className="text-xs text-muted-foreground">
            Add one email per line, or separate by commas. {parsedEmails.length} email{parsedEmails.length === 1 ? "" : "s"} detected.
          </p>
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium text-[hsl(var(--foreground))]">Optional context</span>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[92px]"
          placeholder="What kind of team is this, and how do you expect to use shared planning?"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={requestInvite.isPending || requestedSeatCount === "" || parsedEmails.length === 0}
          onClick={() => {
            setFeedback(null);
            requestInvite.mutate();
          }}
        >
          {requestInvite.isPending ? "Saving..." : initialRequest ? "Update Team invite request" : "Request Team invites"}
        </Button>
        {initialRequest ? (
          <p className="text-xs text-muted-foreground">
            Current status: {prettify(initialRequest.status)}
            {initialRequest.pipelineStage ? ` · ${prettify(initialRequest.pipelineStage)}` : ""} · Submitted{" "}
            {initialRequest.requestCount} time{initialRequest.requestCount === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
