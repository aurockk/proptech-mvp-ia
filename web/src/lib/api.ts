const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() ||
  "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || res.statusText || "request_failed";
    throw new Error(msg);
  }
  return data as T;
}

export async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { method: "POST", body: form });
  return handle<T>(res);
}
