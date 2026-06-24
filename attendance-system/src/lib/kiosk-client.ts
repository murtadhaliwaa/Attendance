import { parseJsonResponse } from "@/lib/api-utils";

/** طلبات الكشك — تعتمد على جلسة HttpOnly (لا تمرّر المفتاح السري للعميل) */
export async function kioskFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}

export async function kioskJson<T>(
  input: string,
  init?: RequestInit
): Promise<{ res: Response; data: T }> {
  const res = await kioskFetch(input, init);
  const data = await parseJsonResponse<T>(res);
  return { res, data };
}
