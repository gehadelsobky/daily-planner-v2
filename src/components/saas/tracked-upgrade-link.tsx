"use client";

import Link from "next/link";

type TrackedUpgradeLinkProps = {
  href: string;
  source: string;
  recommendedTrack?: "pro" | "team";
  activeState?: string;
  className?: string;
  children: React.ReactNode;
};

export function TrackedUpgradeLink({
  href,
  source,
  recommendedTrack,
  activeState,
  className,
  children
}: TrackedUpgradeLinkProps) {
  const trackClick = () => {
    const payload = JSON.stringify({
      event_type: "upgrade_cta_clicked",
      source,
      recommended_track: recommendedTrack,
      active_state: activeState,
      target_href: href
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/workspace/conversion-events", blob);
      return;
    }

    void fetch("/api/workspace/conversion-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    });
  };

  return (
    <Link href={href} className={className} onClick={trackClick}>
      {children}
    </Link>
  );
}
