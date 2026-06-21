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
