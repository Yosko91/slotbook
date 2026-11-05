const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Role = "STUDENT" | "STAFF";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface ErrorBody {
  error?: string;
  code?: string;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string>;
  constructor(status: number, body: ErrorBody) {
    super(body.error ?? "Something went wrong");
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const login = (email: string, password: string) =>
  api<User>("/api/auth/login", { method: "POST", body: { email, password } });
export const logout = () => api<void>("/api/auth/logout", { method: "POST" });
export const getMe = () => api<User>("/api/auth/me");
