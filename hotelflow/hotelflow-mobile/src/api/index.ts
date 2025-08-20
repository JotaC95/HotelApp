// src/api/index.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
// @ts-ignore  -- types provistos por @types/base-64 (instalar si faltan)
import { encode as btoa } from "base-64";
import { API_BASE_URL } from "../config";

/** ===== Credenciales ===== */
export type Credentials = { username: string; password: string };
const CREDS_KEY = "creds";

/** Guarda/lee/borra credenciales en SecureStore */
export const saveCreds = async (c: Credentials) =>
    SecureStore.setItemAsync(CREDS_KEY, JSON.stringify(c));

export const loadCreds = async (): Promise<Credentials | null> => {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
};

export const clearCreds = async () => SecureStore.deleteItemAsync(CREDS_KEY);

/** ===== Axios base ===== */
const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

/** Setea el header Authorization con Basic <base64> */
export const setAuthHeaderFromCreds = async (username: string, password: string) => {
    const token = btoa(`${username}:${password}`);
    client.defaults.headers.common.Authorization = `Basic ${token}`;
    await saveCreds({ username, password });
};

/** Limpia el Authorization */
const clearAuthHeader = async () => {
    delete client.defaults.headers.common.Authorization;
    await clearCreds();
};

/** Devuelve el cliente (si hay creds guardadas, asegura el header) */
export const getClient = async () => {
    const creds = await loadCreds();
    if (creds) {
        const token = btoa(`${creds.username}:${creds.password}`);
        client.defaults.headers.common.Authorization = `Basic ${token}`;
    }
    return client;
};

/** ===== Helpers HTTP ===== */
export const getJSON = async <T>(url: string, params?: any) => {
    const c = await getClient();
    const r = await c.get<T>(url, { params });
    return r.data;
};

export const postJSON = async <T>(url: string, data?: any) => {
    const c = await getClient();
    const r = await c.post<T>(url, data, {
        headers: { "Content-Type": "application/json" },
    });
    return r.data;
};

export const postForm = async <T>(url: string, form: FormData) => {
    const c = await getClient();
    const r = await c.post<T>(url, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
};

/** ===== Flujos de auth (login real con Basic) ===== */
export const login = async (username: string, password: string) => {
    await setAuthHeaderFromCreds(username, password);
    // Ping sencillo para validar credenciales
    const c = await getClient();
    await c.get("/rooms/"); // debe responder 200 si el Basic es válido
};

export const logout = async () => {
    await clearAuthHeader();
};