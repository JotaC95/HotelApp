// src/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
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

type AuthContextType = {
    isAuthenticated: boolean;
    signIn: (username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [ready, setReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Rehidratación al montar
    useEffect(() => {
        (async () => {
        try {
            const creds = await loadCreds();
            if (creds) {
            await setAuthHeaderFromCreds(creds.username, creds.password);
            const c = await getClient();
            // “Ping” simple al backend protegido
            await c.get("/rooms/");
            setIsAuthenticated(true);
            }
        } catch {
            setIsAuthenticated(false);
        } finally {
            setReady(true);
        }
        })();
    }, []);

    const signIn = async (username: string, password: string) => {
        try {
        await apiLogin(username, password); // valida y persiste
        setIsAuthenticated(true);
        } catch (e: any) {
        setIsAuthenticated(false);
        const msg =
            e?.response?.status === 401
            ? "Usuario o contraseña inválidos"
            : "No se pudo iniciar sesión";
        Alert.alert("Login", msg);
        throw e;
        }
    };

    const signOut = async () => {
        await apiLogout();
        setIsAuthenticated(false);
    };

    const value = useMemo(
        () => ({ isAuthenticated, signIn, signOut }),
        [isAuthenticated]
    );

    if (!ready) return null; // Splash simple. Opcional: mostrar loader

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};