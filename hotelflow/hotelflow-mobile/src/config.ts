// hotelflow-mobile/src/config.ts
import { API_BASE_URL as ENV_BASE_URL, API_DEBUG as ENV_DEBUG } from "@env";

export const API_BASE_URL: string =
  ENV_BASE_URL || "http://127.0.0.1:8000/api/housekeeping";

export const API_DEBUG: boolean = String(ENV_DEBUG).toLowerCase() === "true";

// Si usaras token (opcional)
export const API_TOKEN = "";
// Para Android emulador:
/// "http://10.0.2.2:8000/api/housekeeping"
// Dispositivo físico: IP local "http://192.168.1.50:8000/api/housekeeping"
