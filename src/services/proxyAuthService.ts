const API_URL = "https://proxy-sigma-gilt.vercel.app/api/auth";

interface ProxyAuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  [key: string]: unknown;
}

async function postAuth(action: string, email: string, password: string): Promise<ProxyAuthResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      email,
      password,
    }),
  });

  const data = (await response.json()) as ProxyAuthResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "Authentication failed");
  }

  return data;
}

export async function registerUser(email: string, password: string): Promise<ProxyAuthResponse> {
  return postAuth("register", email, password);
}

export async function loginUser(email: string, password: string): Promise<ProxyAuthResponse> {
  return postAuth("login", email, password);
}
