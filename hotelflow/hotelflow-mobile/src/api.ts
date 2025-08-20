// src/api.ts
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";

// ===== Credenciales guardadas =====
export type Credentials = { username: string; password: string };

export const saveCreds = async (c: Credentials) =>
    SecureStore.setItemAsync("creds", JSON.stringify(c));

export const loadCreds = async (): Promise<Credentials | null> => {
    const raw = await SecureStore.getItemAsync("creds");
    return raw ? JSON.parse(raw) : null;
};

export const clearCreds = async () => SecureStore.deleteItemAsync("creds");

// ===== Axios client =====
let client: AxiosInstance | null = null;

export const getClient = async (): Promise<AxiosInstance> => {
    if (!client) {
        client = axios.create({
        baseURL: API_BASE_URL,
        timeout: 15000,
        });
    }
    return client;
};

// Setear header Authorization con Basic Auth, a partir de credenciales
export const setAuthHeaderFromCreds = async (
    username: string,
    password: string
    ) => {
    const c = await getClient();
    // btoa para RN
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
// Login “real”: intenta acceder a un endpoint protegido usando Basic Auth.
// Si responde 200, persiste credenciales y deja el header seteado.
export const login = async (username: string, password: string) => {
    const c = await getClient();
    // Set header temporalmente con estas credenciales para probar
    await setAuthHeaderFromCreds(username, password);
    // Ping protegido: ajusta si tu backend requiere otro endpoint
    await c.get("/rooms/");
    // Si llegó aquí, credenciales válidas: persistimos
    await saveCreds({ username, password });
};

// Logout: borra store y header
export const logout = async () => {
    await clearCreds();
    await clearAuthHeader();
};

// ===== Helpers de requests =====
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