import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";

export type Credentials = { username: string; password: string };

export const saveCreds = async (c: Credentials) =>
    SecureStore.setItemAsync("creds", JSON.stringify(c));
export const loadCreds = async (): Promise<Credentials | null> => {
    const raw = await SecureStore.getItemAsync("creds");
    return raw ? JSON.parse(raw) : null;
};
export const clearCreds = async () => SecureStore.deleteItemAsync("creds");

export const makeClient = async () => {
    const creds = await loadCreds();
    const client = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });
    if (creds) {
        const token = btoa(`${creds.username}:${creds.password}`);
        client.defaults.headers.common.Authorization = `Basic ${token}`;
    }
    return client;
};

export type Task = {
    id: string;
    title: string;
    status: "pending" | "done";
};

export async function fetchRoomTasks(roomId: string): Promise<Task[]> {
    return [
        { id: "1", title: "Cambiar sábanas", status: "pending" },
        { id: "2", title: "Limpiar baño", status: "done" },
    ];
}