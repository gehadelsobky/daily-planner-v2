"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/fetcher";

export function TopNav({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["top-notifications"],
    queryFn: () => apiFetch<{
      unreadCount: number;
      notifications: Array<{
        id: string;
        title: string;
        body: string;
        type: "carryover_tasks" | "system_alert";
        status: "unread" | "read" | "dismissed";
        payload: { taskIds?: string[] } | null;
        createdAt: string;
      }>;
    }>("/api/notifications?limit=15"),
    enabled: loggedIn,
    refetchInterval: 30_000
  });

  const visibleNotifications = useMemo(
    () =>
      (notificationsQuery.data?.notifications ?? []).filter(
        (notification) => notification.status !== "dismissed"
      ),
    [notificationsQuery.data?.notifications]
  );

  const markRead = useMutation({
    mutationFn: (notificationIds: string[]) =>
      apiFetch("/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notification_ids: notificationIds })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["top-notifications"] });
    }
  });

  const dismissNotification = useMutation({
    mutationFn: (notificationId: string) =>
      apiFetch("/api/notifications/dismiss", {
        method: "POST",
        body: JSON.stringify({ notification_ids: [notificationId] })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["top-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
    }
  });

  const actNotification = useMutation({
    mutationFn: (payload: { notification_id: string; action: "add_today" | "dismiss" }) =>
      apiFetch("/api/notifications/action", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["top-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["daily"] });
    }
  });

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border)/0.7)] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href={loggedIn ? "/daily" : "/"} className="flex items-center gap-4 text-lg font-semibold">
          <Image src="/logo.svg" alt="Brand Logo" width={128} height={128} className="w-32 h-auto" priority />
          <div className="flex flex-col">
            <span className="text-[hsl(var(--foreground))]">Daily Planner</span>
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Focus clearly. Finish consistently.
            </span>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[hsl(var(--foreground))]">
          {loggedIn ? (
            <>
              <Link
                href="/daily"
                className="rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 font-medium shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                Daily
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 font-medium shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 font-medium shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                Settings
              </Link>
              <div className="relative">
                <Button
                  variant="secondary"
                  onClick={() => setIsOpen((prev) => !prev)}
                  className="relative px-3"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  {(notificationsQuery.data?.unreadCount ?? 0) > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00b0ff] px-1 text-[11px] font-semibold text-white">
                      {notificationsQuery.data?.unreadCount}
                    </span>
                  ) : null}
                </Button>
                {isOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-[360px] rounded-xl border border-border bg-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">Notifications</p>
                      {(notificationsQuery.data?.unreadCount ?? 0) > 0 ? (
                        <Button
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            markRead.mutate(
                              visibleNotifications
                                .filter((notification) => notification.status === "unread")
                                .map((notification) => notification.id)
                            )
                          }
                        >
                          Mark all read
                        </Button>
                      ) : null}
                    </div>
                    <div className="max-h-[380px] space-y-2 overflow-auto">
                      {visibleNotifications.length ? (
                        visibleNotifications.map((notification) => (
                          <div key={notification.id} className="rounded-md border border-border p-2">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{notification.title}</p>
                              {notification.status === "unread" ? <Badge>new</Badge> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{notification.body}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {notification.type === "carryover_tasks" ? (
                                <Button
                                  className="h-7 px-2 text-xs"
                                  onClick={() =>
                                    actNotification.mutate({
                                      notification_id: notification.id,
                                      action: "add_today"
                                    })
                                  }
                                  disabled={actNotification.isPending}
                                >
                                  Add To Today
                                </Button>
                              ) : null}
                              <Button
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                                onClick={() => markRead.mutate([notification.id])}
                                disabled={markRead.isPending}
                              >
                                Mark Read
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => dismissNotification.mutate(notification.id)}
                                disabled={dismissNotification.isPending}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No notifications.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <Button variant="secondary" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 font-medium shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 font-medium shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition hover:border-[#00b0ff] hover:text-[#1745C7]"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
