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
      const message = (error as { error?: string }).error ?? "Request failed";
      if (res.status >= 500) {
        throw new Error("A server error occurred. Please try again.");
      }
      throw new Error(message);
    }

    throw new Error(
      res.status >= 500
        ? "A server error occurred. Please try again."
        : `Request failed (${res.status} ${res.statusText}).`
    );
  }

  const okContentType = res.headers.get("content-type") ?? "";
  if (!okContentType.includes("application/json")) {
    throw new Error("The server returned an unexpected response. Please try again.");
  }

  return res.json() as Promise<T>;
}
