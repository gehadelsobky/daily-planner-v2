export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const error = await res
        .json()
        .catch(() => ({ error: "Request failed", details: undefined as unknown }));
      const details = Array.isArray((error as { details?: unknown }).details)
        ? `: ${(error as { details: unknown[] }).details.join(", ")}`
        : "";
      throw new Error(`${(error as { error?: string }).error ?? "Request failed"}${details}`);
    }

    const text = await res.text().catch(() => "");
    const hint = text.trim() ? ` ${text.slice(0, 140)}` : "";
    throw new Error(`Request failed (${res.status} ${res.statusText}).${hint}`);
  }

  const okContentType = res.headers.get("content-type") ?? "";
  if (!okContentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const hint = text.trim() ? ` ${text.slice(0, 180)}` : "";
    throw new Error(`Request succeeded but returned non-JSON content.${hint}`);
  }

  return res.json() as Promise<T>;
}
