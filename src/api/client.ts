// src/api/client.ts — API client with auth, rate limiting, and error handling

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://finnhub.io/api/v1";
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

export class ApiError extends Error {
  public status: number;
  public endpoint: string;

  constructor(
    message: string,
    status: number,
    endpoint: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

export async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    throw new ApiError(
      "API key not configured. Set VITE_FINNHUB_API_KEY in .env.local",
      401,
      path
    );
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      path
    );
  }

  return response.json() as Promise<T>;
}

// Rate limiting helper: Finnhub allows 60 calls/min on free tier
const requestQueue: number[] = [];
export async function apiGetThrottled<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (requestQueue.length > 0 && requestQueue[0] < windowStart) {
    requestQueue.shift();
  }
  if (requestQueue.length >= 55) {
    const waitMs = requestQueue[0] - windowStart + 1000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  requestQueue.push(now);
  return apiGet<T>(path, params);
}
