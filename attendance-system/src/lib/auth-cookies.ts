export function hasSupabaseSessionCookie(
  cookies: { name: string; value: string }[]
) {
  return cookies.some(
    ({ name, value }) =>
      name.startsWith("sb-") && name.includes("auth-token") && !!value
  );
}
