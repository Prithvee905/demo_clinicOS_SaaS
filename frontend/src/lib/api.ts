const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  name: string;
  clinicId: string;
  clinicCode: string;
  role: string;
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = localStorage.getItem('clinic_os_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

export function setSession(session: UserSession | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem('clinic_os_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('clinic_os_session');
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  
  if (session?.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  let response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 && session?.refreshToken) {
    // Attempt Token Refresh
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const newSession: UserSession = await refreshResponse.json();
          // Update tokens in local storage
          const updatedSession = {
            ...session,
            accessToken: newSession.accessToken,
            refreshToken: newSession.refreshToken,
          };
          setSession(updatedSession);
          onRefreshed(newSession.accessToken);
        } else {
          setSession(null);
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      } catch (err) {
        setSession(null);
        window.location.href = '/login';
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
    
    // Queue current request to run after refresh succeeds
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        resolve(fetch(url, { ...options, headers }));
      });
    });
  }
  
  return response;
}
