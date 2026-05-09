"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";

type InterestRequestButtonProps = {
  interestType: "pro" | "team";
  source: string;
  label: string;
  requestedLabel?: string;
  variant?: "default" | "secondary" | "ghost" | "danger";
  className?: string;
  initialRequested?: boolean;
};

export function InterestRequestButton({
  interestType,
  source,
  label,
  requestedLabel = "Requested",
  variant = "default",
  className,
  initialRequested = false
}: InterestRequestButtonProps) {
  const [submitted, setSubmitted] = useState(initialRequested);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requestInterest = useMutation({
    mutationFn: () =>
      apiFetch<{ request: { id: string; type: string; status: string; requestCount: number } }>(
        "/api/workspace/interests",
        {
          method: "POST",
          body: JSON.stringify({
            type: interestType,
            source
          })
        }
      ),
    onSuccess: (response) => {
      setSubmitted(true);
      setFeedback(
        response.request.requestCount > 1
          ? `Updated your ${interestType.toUpperCase()} request.`
          : `Saved your ${interestType.toUpperCase()} interest.`
      );
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to save your interest.");
    }
  });

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        className={className}
        disabled={requestInterest.isPending}
        onClick={() => {
          setFeedback(null);
          requestInterest.mutate();
        }}
      >
        {requestInterest.isPending ? "Saving..." : submitted ? requestedLabel : label}
      </Button>
      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
