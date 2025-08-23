// src/screens/RosterScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { getClient } from "../api";


type Props = NativeStackScreenProps<RootStackParamList, "Roster">;

type Zone = { id: number; name: string };
type Team = { id: number; name: string };
type Shift = {
    id: number;
    roster: number;
    date: string;     // "YYYY-MM-DD"
    start: string;    // "HH:MM:SS"
    end: string;      // "HH:MM:SS"
    zone: number | null;
    team: number | null;
    planned_minutes: number;
};

function fmtTime(t?: string) {
    if (!t) return "";
    const [h, m] = t.split(":");
    return `${h}:${m}`;
}
function fmtDate(d?: string) {
    if (!d) return "";
    const x = new Date(d + "T00:00:00");
    return x.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
}

export default function RosterScreen({}: Props) {
    const [loading, setLoading] = useState(true);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [zones, setZones] = useState<Record<number, string>>({});
    const [teams, setTeams] = useState<Record<number, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
        const client = await getClient();

        // Traemos shifts (turnos)
        const s = await client.get<Shift[]>("/scheduling/shifts/");
        setShifts(Array.isArray(s.data) ? s.data : []);

        // Opcional: Mapear nombres de zona/equipo
        const [z, t] = await Promise.all([
            client.get<Zone[]>("/scheduling/zones/"),
            client.get<Team[]>("/scheduling/teams/"),
        ]);

        const zmap = Object.fromEntries((z.data || []).map((z) => [z.id, z.name]));
        const tmap = Object.fromEntries((t.data || []).map((tm) => [tm.id, tm.name]));
        setZones(zmap);
        setTeams(tmap);
        } catch (e: any) {
        console.log("roster load error:", e?.message, e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo cargar el roster.");
        } finally {
        setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Agrupar por fecha para mostrar cabeceras de día
    const byDate = useMemo(() => {
        const m = new Map<string, Shift[]>();
        for (const s of shifts) {
        if (!m.has(s.date)) m.set(s.date, []);
        m.get(s.date)!.push(s);
        }
        // orden por hora
        for (const [k, arr] of m) {
        arr.sort((a, b) => a.start.localeCompare(b.start));
        }
        return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [shifts]);

    return (
        <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Roster / Turnos</Text>

        <FlatList
            data={byDate}
            keyExtractor={([date]) => date}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            renderItem={({ item: [date, dayShifts] }) => (
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "800", color: "#374151", marginBottom: 8 }}>
                {fmtDate(date)} — {date}
                </Text>

                {dayShifts.map((s) => (
                <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.8}
                    style={{
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 10,
                    backgroundColor: "white",
                    marginBottom: 8,
                    }}
                >
                    <Text style={{ fontWeight: "700" }}>
                    {fmtTime(s.start)} – {fmtTime(s.end)} ({s.planned_minutes} min)
                    </Text>
                    <Text style={{ color: "#6b7280", marginTop: 2 }}>
                    Zona: {s.zone ? zones[s.zone] ?? `#${s.zone}` : "—"}
                    </Text>
                    <Text style={{ color: "#6b7280" }}>
                    Equipo: {s.team ? teams[s.team] ?? `#${s.team}` : "—"}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
            )}
            ListEmptyComponent={
            !loading ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                    <Text style={{ color: "#6b7280" }}>No hay turnos generados.</Text>
                    <Text style={{ color: "#9ca3af", marginTop: 4 }}>
                        Genera un roster con el comando o crea shifts en admin.
                    </Text>
                </View>
            ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
        />
        </View>
    );
}

async function generateRoster(rosterId: number) {
    try {
        const c = await getClient();
        await c.post(`/scheduling/rosters/${rosterId}/generate-ai/`, {
        policy: { start_window: "07:00", end_window: "10:00", default_shift_hours: 8, team_size: 2 }
        });
        Alert.alert("OK", "Roster generado");
        // luego refresca tu lista de shifts
    } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.detail ?? e?.message ?? "No se pudo generar");
    }
}