import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// pega csrftoken do cookie (Django)
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift() || null;
  return null;
}

/**
 * Garante que o cookie csrftoken exista.
 * Depende do endpoint backend: GET /api/auth/csrf/
 */
export async function ensureCsrf(): Promise<string | null> {
  try {
    await api.get("/auth/csrf/"); // seta csrftoken no cookie
  } catch {
    // ignora
  }
  return getCookie("csrftoken");
}

// interceptor para mandar o token em requests mutáveis
api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  const isWrite = ["post", "put", "patch", "delete"].includes(method);

  if (isWrite) {
    const token = getCookie("csrftoken") || (await ensureCsrf());
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["X-CSRFToken"] = token;
    }
  }
  return config;
});