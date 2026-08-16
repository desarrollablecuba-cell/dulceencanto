'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  HTTP CLIENT — Cliente HTTP centralizado con autenticación JWT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Este es el ÚNICO cliente HTTP que deben usar todos los módulos del frontend
 *  para peticiones a endpoints protegidos del backend.
 *
 *  Características:
 *  - Añade automáticamente `Authorization: Bearer <token>` a todas las peticiones.
 *  - Si recibe 401 (token expirado/inválido): cierra sesión, elimina token,
 *    redirige al login.
 *  - Manejo centralizado de errores: 403, 404, 500.
 *  - Métodos: get, post, put, patch, delete, upload.
 *
 *  Uso:
 *    import { httpClient } from '@/lib/http-client';
 *
 *    // GET
 *    const products = await httpClient.get('/api/admin/products');
 *
 *    // POST
 *    const newProduct = await httpClient.post('/api/admin/products', { ... });
 *
 *    // PUT
 *    await httpClient.put('/api/admin/products/123', { ... });
 *
 *    // DELETE
 *    await httpClient.delete('/api/admin/products/123');
 *
 *    // Upload (multipart/form-data)
 *    const { url } = await httpClient.upload('/api/admin/categories/upload', file);
 *
 *  NUNCA uses fetch() directamente para endpoints protegidos. Usa httpClient.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Token Manager
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_TOKEN_KEY = 'diaz-admin-token';
const CUSTOMER_TOKEN_KEY = 'diaz-customer-token';

export const tokenManager = {
  getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  setAdminToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clearAdminToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
  getCustomerToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  },
  setCustomerToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  },
  clearCustomerToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  },
  clearAll(): void {
    this.clearAdminToken();
    this.clearCustomerToken();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Session Manager — maneja logout y redirect al login
// ─────────────────────────────────────────────────────────────────────────────

class SessionManager {
  private adminLogoutHandler: (() => void) | null = null;
  private customerLogoutHandler: (() => void) | null = null;

  onAdminLogout(handler: () => void): void {
    this.adminLogoutHandler = handler;
  }

  onCustomerLogout(handler: () => void): void {
    this.customerLogoutHandler = handler;
  }

  /** Cierra sesión de admin: limpia token y redirige al login. */
  logoutAdmin(): void {
    tokenManager.clearAdminToken();
    if (this.adminLogoutHandler) {
      this.adminLogoutHandler();
    } else {
      // Fallback: redirigir al login de admin
      if (typeof window !== 'undefined') {
        window.location.href = '/admin?expired=1';
      }
    }
  }

  /** Cierra sesión de customer. */
  logoutCustomer(): void {
    tokenManager.clearCustomerToken();
    if (this.customerLogoutHandler) {
      this.customerLogoutHandler();
    } else {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }
}

export const sessionManager = new SessionManager();

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Client
// ─────────────────────────────────────────────────────────────────────────────

export interface HttpClientOptions {
  /** Si true, usa el token del customer en vez del admin. */
  customerToken?: boolean;
  /** Headers adicionales. */
  headers?: Record<string, string>;
  /** Si true, no lanza error en 404 (devuelve null). */
  nullableOn404?: boolean;
}

class HttpClient {
  /**
   * Wrapper de fetch que añade Authorization y maneja errores comunes.
   * @returns el JSON parseado, o null si nullableOn404 y response es 404.
   * @throws Error con mensaje legible si la petición falla.
   */
  private async request<T = any>(
    url: string,
    method: string,
    body?: any,
    options?: HttpClientOptions
  ): Promise<T> {
    const token = options?.customerToken
      ? tokenManager.getCustomerToken()
      : tokenManager.getAdminToken();

    const headers: Record<string, string> = {
      ...(options?.headers || {}),
    };

    // Añadir Authorization si hay token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Añadir Content-Type solo si hay body y no es FormData
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: body !== undefined
        ? (body instanceof FormData ? body : JSON.stringify(body))
        : undefined,
    };

    let res: Response;
    try {
      res = await fetch(url, fetchOptions);
    } catch (err) {
      throw new Error('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    }

    // Manejo centralizado de status codes
    if (res.status === 401) {
      // Token expirado o inválido → cerrar sesión y redirigir
      if (options?.customerToken) {
        sessionManager.logoutCustomer();
      } else {
        sessionManager.logoutAdmin();
      }
      throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
    }

    if (res.status === 403) {
      throw new Error('No tienes permisos para realizar esta acción.');
    }

    if (res.status === 404) {
      if (options?.nullableOn404) return null as T;
      throw new Error('Recurso no encontrado.');
    }

    if (res.status >= 500) {
      throw new Error('Error del servidor. Inténtalo más tarde.');
    }

    // Status 2xx — parsear JSON
    if (res.status === 204) return null as T;

    const text = await res.text();
    if (!text) return null as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /** GET request. */
  get<T = any>(url: string, options?: HttpClientOptions): Promise<T> {
    return this.request<T>(url, 'GET', undefined, options);
  }

  /** POST request. */
  post<T = any>(url: string, body?: any, options?: HttpClientOptions): Promise<T> {
    return this.request<T>(url, 'POST', body, options);
  }

  /** PUT request. */
  put<T = any>(url: string, body?: any, options?: HttpClientOptions): Promise<T> {
    return this.request<T>(url, 'PUT', body, options);
  }

  /** PATCH request. */
  patch<T = any>(url: string, body?: any, options?: HttpClientOptions): Promise<T> {
    return this.request<T>(url, 'PATCH', body, options);
  }

  /** DELETE request. */
  delete<T = any>(url: string, options?: HttpClientOptions): Promise<T> {
    return this.request<T>(url, 'DELETE', undefined, options);
  }

  /** Upload de archivo (multipart/form-data). */
  upload<T = any>(url: string, file: File, options?: HttpClientOptions): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<T>(url, 'POST', formData, options);
  }
}

export const httpClient = new HttpClient();

// ─────────────────────────────────────────────────────────────────────────────
// Global Fetch Interceptor
// ─────────────────────────────────────────────────────────────────────────────
// Añade automáticamente Authorization: Bearer a todas las peticiones
// a /api/admin/* y maneja 401 globalmente.
//
// IMPORTANTE: se instala automáticamente al importar este módulo (no requiere
// setupFetchInterceptor() en useEffect). Esto garantiza que el interceptor
// esté activo ANTES de que cualquier componente haga fetch.

let interceptorInstalled = false;

export function setupFetchInterceptor(): void {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Determinar la URL
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    // Solo interceptar peticiones a /api/admin/ (pero NO a /api/admin/auth que es login)
    const isAdminApi = url.includes('/api/admin/');
    const isAuthEndpoint = url.includes('/api/admin/auth');

    if (isAdminApi && !isAuthEndpoint) {
      // Añadir Authorization header
      const token = tokenManager.getAdminToken();
      if (token) {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        init = { ...init, headers };
      }
    }

    // Ejecutar la petición original con manejo de errores
    let response: Response;
    try {
      response = await originalFetch.call(window, input, init);
    } catch (err) {
      // Si es un error de red (servidor recompilando, conexión caída),
      // devolver una Response vacía en vez de crashear
      console.warn('[http-client] Fetch error, servidor puede estar recompilando:', err);
      return new Response(JSON.stringify({ error: 'Error de conexión' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Interceptar 401 en endpoints admin (excepto auth que maneja su propio 401)
    if (isAdminApi && !isAuthEndpoint && response.status === 401) {
      sessionManager.logoutAdmin();
    }

    return response;
  };
}

// Auto-instalar al importar el módulo (ejecución a nivel de módulo, antes
// de cualquier render de componente). Esto evita el race condition donde
// los useEffect de componentes hijos se ejecutan antes que el del padre.
if (typeof window !== 'undefined') {
  setupFetchInterceptor();
}

/**
 * Fetch para endpoints públicos (sin autenticación).
 * Solo usar para: /api/products, /api/categories, /api/siteconfig, etc.
 */
export async function publicGet<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
