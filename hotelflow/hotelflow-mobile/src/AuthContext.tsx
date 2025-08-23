// src/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Alert } from "react-native";
import {
  getClient,
  loadCreds,
  login as apiLogin,
  logout as apiLogout,
  setAuthHeaderFromCreds,
} from "./api";

// --- Tipos de rol (ajusta si ya los tienes en otro archivo) ---
export type UserRole = "CLEANER" | "SUPERVISOR" | "MAINTENANCE" | "FRONTDESK";

// --- Tipo del contexto ---
type AuthContextType = {
  ready: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  hasRole: (r: UserRole) => boolean;
};

// --- Contexto ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helper: obtener rol/usuario desde backend (con fallback) ---
async function fetchIdentityFromAPI(): Promise<{
  role: UserRole;
  username: string | null;
}> {
  try {
    const c = await getClient();
    // Debe existir en el backend: /api/housekeeping/accounts/me/
    // Respuesta esperada: { username, groups: ["cleaner" | "supervisor" | "maintenance" | "frontdesk", ...] }
    const res = await c.get("/accounts/me/");
    const groups: string[] = res.data?.groups || [];
    const uname: string | null = res.data?.username ?? null;

    const g = groups.map((x) => String(x).toLowerCase());
    if (g.includes("supervisor")) return { role: "SUPERVISOR", username: uname };
    if (g.includes("maintenance")) return { role: "MAINTENANCE", username: uname };
    if (g.includes("frontdesk")) return { role: "FRONTDESK", username: uname };
    return { role: "CLEANER", username: uname };
  } catch {
    // Fallback para no bloquear la navegación si /accounts/me/ aún no existe
    return { role: "CLEANER", username: null };
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Interceptor 401 (si el backend responde 401, cerramos sesión local)
  useEffect(() => {
    let ejectId: number | null = null;

    (async () => {
      try {
        const c = await getClient();
        ejectId = c.interceptors.response.use(
          (resp) => resp,
          async (error) => {
            const status = error?.response?.status;
            if (status === 401) {
              try {
                await apiLogout();
              } catch {/* noop */}
              if (mountedRef.current) {
                setIsAuthenticated(false);
                setRole(null);
                setUsername(null);
              }
            }
            return Promise.reject(error);
          }
        );
      } catch {/* noop */}
    })();

    return () => {
      (async () => {
        try {
          if (ejectId !== null) {
            const c = await getClient();
            c.interceptors.response.eject(ejectId);
          }
        } catch {/* noop */}
      })();
    };
  }, []);

  // Rehidratación al montar
  useEffect(() => {
    (async () => {
      try {
        const creds = await loadCreds();
        if (creds) {
          await setAuthHeaderFromCreds(creds.username, creds.password);

          // Ping a un endpoint protegido para validar
          const c = await getClient();
          await c.get("/rooms/");

          if (!mountedRef.current) return;
          setIsAuthenticated(true);

          // Obtener rol/usuario
          const ident = await fetchIdentityFromAPI();
          if (!mountedRef.current) return;
          setRole(ident.role);
          setUsername(ident.username);
        } else {
          if (!mountedRef.current) return;
          setIsAuthenticated(false);
          setRole(null);
          setUsername(null);
        }
      } catch {
        if (!mountedRef.current) return;
        setIsAuthenticated(false);
        setRole(null);
        setUsername(null);
      } finally {
        if (mountedRef.current) setReady(true);
      }
    })();
  }, []);

  const refreshRole = async () => {
    const ident = await fetchIdentityFromAPI();
    if (!mountedRef.current) return;
    setRole(ident.role);
    setUsername(ident.username);
  };

  const signIn = async (user: string, password: string) => {
    try {
      // valida y persiste credenciales; el interceptor pondrá el header en cada request
      await apiLogin(user, password);
      if (!mountedRef.current) return;

      setIsAuthenticated(true);
      const ident = await fetchIdentityFromAPI();
      if (!mountedRef.current) return;
      setRole(ident.role);
      setUsername(ident.username ?? user);
    } catch (e: any) {
      if (mountedRef.current) {
        setIsAuthenticated(false);
        setRole(null);
        setUsername(null);
      }
      const msg =
        e?.response?.status === 401
          ? "Usuario o contraseña inválidos"
          : "No se pudo iniciar sesión";
      Alert.alert("Login", msg);
      throw e;
    }
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } finally {
      if (!mountedRef.current) return;
      setIsAuthenticated(false);
      setRole(null);
      setUsername(null);
    }
  };

  const hasRole = (r: UserRole) => role === r;

  const value = useMemo<AuthContextType>(
    () => ({
      ready,
      isAuthenticated,
      role,
      username,
      signIn,
      signOut,
      refreshRole,
      hasRole,
    }),
    [ready, isAuthenticated, role, username]
  );

  if (!ready) return null; // Splash simple

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};