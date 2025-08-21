// src/api.ts
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";

/**
 * Resuelve una base URL correcta para la API de housekeeping.
 * - Si API_BASE_URL ya termina en /api/housekeeping, la usa tal cual.
 * - Si no, la normaliza y agrega /api/housekeeping una sola vez.
 */
function resolveHousekeepingBase(base: string): string {
  const trimmed = base.replace(/\/+$/, ""); // sin barras al final
  const hk = "/api/housekeeping";
  if (trimmed.endsWith(hk)) return trimmed; // ya viene completo
  return trimmed + hk;
}

// ===== Credenciales =====
export type Credentials = { username: string; password: string };

export const saveCreds = async (c: Credentials) =>
  SecureStore.setItemAsync("creds", JSON.stringify(c));

export const loadCreds = async (): Promise<Credentials | null> => {
  const raw = await SecureStore.getItemAsync("creds");
  return raw ? JSON.parse(raw) : null;
};

export const clearCreds = async () => SecureStore.deleteItemAsync("creds");

// ===== Axios (singleton) =====
let client: AxiosInstance | null = null;

export const getClient = async (): Promise<AxiosInstance> => {
  if (!client) {
    const base = resolveHousekeepingBase(API_BASE_URL);
    client = axios.create({
      baseURL: base,
      timeout: 10000,
    });
    // Aviso si detectamos duplicados potenciales (solo consola)
    if (API_BASE_URL.replace(/\/+$/, "").endsWith("/api/housekeeping")) {
      // OK, base ya venía completa
    } else {
      // Base venía “pelada” (host), hemos añadido /api/housekeeping
    }
  }
  return client;
};

// Setear header Authorization con Basic Auth
export const setAuthHeaderFromCreds = async (username: string, password: string) => {
  const c = await getClient();
  const { encode: btoa } = require("base-64");
  const token = btoa(`${username}:${password}`);
  c.defaults.headers.common["Authorization"] = `Basic ${token}`;
};

// Limpiar header Authorization
export const clearAuthHeader = async () => {
  const c = await getClient();
  delete c.defaults.headers.common["Authorization"];
};

// ===== Login / Logout =====
export const login = async (username: string, password: string) => {
  // Set temporal para probar credenciales
  await setAuthHeaderFromCreds(username, password);
  const c = await getClient();
  // ping protegido (ajusta si usas otro)
  await c.get("/rooms/");
  // si funciona, persistimos
  await saveCreds({ username, password });
};

export const logout = async () => {
  await clearCreds();
  await clearAuthHeader();
};

/**
 * Rehidrata Authorization desde SecureStore (para app resume/arranque).
 * Úsalo al boot (AuthContext ya lo hace en tu código).
 */
export const refreshAuthFromStorage = async () => {
  const creds = await loadCreds();
  if (creds) {
    await setAuthHeaderFromCreds(creds.username, creds.password);
  } else {
    await clearAuthHeader();
  }
};

// ===== Helpers =====
export const getJSON = async <T>(url: string, params?: any): Promise<T> => {
  const c = await getClient();
  const res = await c.get<T>(url, { params });
  return res.data;
};

export const postJSON = async <T>(url: string, data?: any): Promise<T> => {
  const c = await getClient();
  const res = await c.post<T>(url, data, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};

export const postForm = async <T>(url: string, form: FormData): Promise<T> => {
  const c = await getClient();
  const res = await c.post<T>(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};