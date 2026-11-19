type AuthenticatedRequestOptions = RequestInit & {
  fallbackMessage?: string;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function authenticatedRequest<T>(
  path: string,
  token: string,
  options: AuthenticatedRequestOptions = {},
): Promise<T> {
  const { fallbackMessage = "Không thể tải dữ liệu. Vui lòng thử lại.", ...init } = options;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    let message = fallbackMessage;
    try {
      const body = (await response.json()) as { detail?: string; message?: string; title?: string };
      message = body.detail ?? body.message ?? body.title ?? message;
    } catch {
      // Use the fallback when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 202) return undefined as T;
  if (response.headers.get("content-type")?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}
