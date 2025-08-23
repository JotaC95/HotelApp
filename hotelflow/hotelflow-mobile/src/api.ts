// src/api.ts
import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, API_DEBUG } from "./config";

// =====================================================
// Tipos útiles (exporta los que necesites en componentes)
// =====================================================
export type Credentials = { username: string; password: string };

export type Room = {
  id: number;
  number: string;
  floor: number;
  status: string;
  zone?: string;
  notes?: string;
};

export type AvailabilityDay = {
  weekday: number; // 0..6 (Mon..Sun)
  start?: string;  // "HH:MM" (opcional si unavailable=true)
  end?: string;    // "HH:MM"
  unavailable: boolean;
};

export type MyAvailabilityPayload = {
  days: AvailabilityDay[];
};

export type MyWeekTaskRow = {
  task_id: number;
  title: string;
  room: number | null;
  planned_start: string | null;
  planned_end: string | null;
};

export type MyWeekShift = {
  start: string;
  end: string;
  zone: string | null;
  team: string | null;
  planned_minutes: number;
};

export type MyWeekDayRow = {
  date: string; // "YYYY-MM-DD"
  shift: MyWeekShift | null;
  team_members: { id: number; first_name: string; last_name: string; username: string }[];
  tasks: MyWeekTaskRow[];
};

export type MyWeekResponse = {
  monday: string;
  days: MyWeekDayRow[];
};

export type MeResponse = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  groups?: string[]; // nombres de grupos
};

// =====================================================
// Cliente Axios (singleton) - baseURL SIEMPRE termina en /api/housekeeping
// =====================================================
let client: AxiosInstance | null = null;

function buildBaseURL(): string {
  // Evita dobles / y asegura sufijo correcto
  let base = API_BASE_URL.trim().replace(/\/+$/, "");
  if (!/\/api\/housekeeping$/.test(base)) {
    base = `${base}/api/housekeeping`;
  }
  return base;
}

export const getClient = async (): Promise<AxiosInstance> => {
  if (client) return client;

  client = axios.create({
    baseURL: buildBaseURL(),
    timeout: 10000,
  });

  // Interceptor de log (opcional)
  if (API_DEBUG) {
    client.interceptors.request.use((config) => {
      const url = `${config.baseURL || ""}${config.url || ""}`;
      // eslint-disable-next-line no-console
      console.warn("[API] →", config.method?.toUpperCase(), url);
      return config;
    });
  }

  return client;
};

// =====================================================
// Credenciales (SecureStore) + Header Authorization (Basic)
// =====================================================
export const saveCreds = async (c: Credentials) =>
  SecureStore.setItemAsync("creds", JSON.stringify(c));

export const loadCreds = async (): Promise<Credentials | null> => {
  const raw = await SecureStore.getItemAsync("creds");
  return raw ? JSON.parse(raw) : null;
};

export const clearCreds = async () => SecureStore.deleteItemAsync("creds");

export const setAuthHeaderFromCreds = async (username: string, password: string) => {
  const c = await getClient();
  // RN no tiene btoa nativo → usa base-64
  const { encode: btoa } = require("base-64");
  const token = btoa(`${username}:${password}`);
  c.defaults.headers.common["Authorization"] = `Basic ${token}`;
};

export const clearAuthHeader = async () => {
  const c = await getClient();
  delete c.defaults.headers.common["Authorization"];
};

// =====================================================
// Login / Logout
// =====================================================
export const login = async (username: string, password: string) => {
  const c = await getClient();
  await setAuthHeaderFromCreds(username, password);

  // “Ping” a un endpoint protegido para validar credenciales
  await c.get("/rooms/");
  await saveCreds({ username, password });
};

export const logout = async () => {
  await clearCreds();
  await clearAuthHeader();
};

// =====================================================
// Helpers genéricos de requests
// =====================================================
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

// =====================================================
// Endpoints de housekeeping (ejemplos)
// =====================================================
export const listRooms = async (): Promise<Room[]> =>
  getJSON<Room[]>("/rooms/");

export const getRoom = async (id: number): Promise<Room> =>
  getJSON<Room>(`/rooms/${id}/`);

// Ejemplo básico para tasks (sin tipado estricto aquí)
export const listTasks = async (params?: any) =>
  getJSON<any>("/tasks/", params);

export const createTask = async (form: FormData) =>
  postForm<any>("/tasks/", form);

export const patchTask = async (id: number, data: any) =>
  postJSON<any>(`/tasks/${id}/`, data); // si tu backend usa PATCH real, puedes usar axios.patch

export const deleteTask = async (id: number) => {
  const c = await getClient();
  await c.delete(`/tasks/${id}/`);
};

// =====================================================
// Endpoints de scheduling (para tus pantallas)
// =====================================================
export const getMyAvailability = async (): Promise<{ days: AvailabilityDay[] }> =>
  getJSON<{ days: AvailabilityDay[] }>("/scheduling/my_availability/");

export const putMyAvailability = async (payload: MyAvailabilityPayload) => {
  const c = await getClient();
  const res = await c.put<{ ok: boolean; rules_created: number }>(
    "/scheduling/my_availability/",
    payload
  );
  return res.data;
};

export const getMyWeek = async (monday: string): Promise<MyWeekResponse> =>
  getJSON<MyWeekResponse>("/scheduling/my_week", { monday });

export const aiGenerateRoster = async (body: any) => {
  const c = await getClient();
  const res = await c.post("/scheduling/rosters/ai/generate/", body);
  return res.data;
};

// =====================================================
// Cuenta / identidad
// =====================================================
export const getMe = async (): Promise<MeResponse> =>
  getJSON<MeResponse>("/accounts/me/");