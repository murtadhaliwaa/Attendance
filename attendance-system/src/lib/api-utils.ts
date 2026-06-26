export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("استجابة فارغة من الخادم");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("استجابة غير صالحة من الخادم");
  }
}

/** طلبات لوحة التحكم — تُرسل كوكيز الجلسة دائماً */
export async function dashboardFetch(
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
