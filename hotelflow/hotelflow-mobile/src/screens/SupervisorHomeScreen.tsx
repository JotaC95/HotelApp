// src/screens/SupervisorHomeScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, RefreshControl, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getClient } from "../api";
import UserBadge from "../components/UserBadge";

type Summary = {
  date: string;
  rooms_summary: Record<string, number>;
  shifts_today: number;
  unassigned_shifts: number;
  unassigned_tasks: number;
  open_incidents: number;
};

const Card = ({ title, value, onPress }: { title: string; value: string | number; onPress?: () => void }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.8 : 1}
    onPress={onPress}
    style={{
      flex: 1,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      backgroundColor: "white",
      minWidth: 140,
      margin: 6,
    }}
  >
    <Text style={{ color: "#6b7280", marginBottom: 6 }}>{title}</Text>
    <Text style={{ fontSize: 22, fontWeight: "800" }}>{value}</Text>
  </TouchableOpacity>
);

export default function SupervisorHomeScreen() {
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getClient();
      const r = await c.get<Summary>("/scheduling/supervisor/summary/");
      setSummary(r.data);
    } catch (e) {
      // noop visual (podemos mostrar toast/alert si prefieres)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <UserBadge />

      <Text style={{ fontSize: 18, fontWeight: "800", marginVertical: 8 }}>Panel del Supervisor</Text>
      <Text style={{ color: "#6b7280", marginBottom: 12 }}>
        Fecha: {summary?.date ?? "—"}
      </Text>

      {loading && !summary ? <ActivityIndicator /> : null}

      {/* KPIs principales */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
        <Card title="Turnos de hoy" value={summary?.shifts_today ?? 0} onPress={() => nav.navigate("Roster")} />
        <Card title="Turnos sin asignar" value={summary?.unassigned_shifts ?? 0} onPress={() => nav.navigate("Roster")} />
        <Card title="Tareas sin asignar" value={summary?.unassigned_tasks ?? 0} onPress={() => nav.navigate("Rooms")} />
        <Card title="Incidentes abiertos" value={summary?.open_incidents ?? 0} onPress={() => nav.navigate("Incidents")} />
      </View>

      {/* Rooms por estado */}
      {!!summary?.rooms_summary && (
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 14, marginBottom: 6 }}>Habitaciones</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
            {Object.entries(summary.rooms_summary).map(([k, v]) => (
              <Card key={k} title={k} value={v} />
            ))}
          </View>
        </>
      )}

      {/* Accesos rápidos */}
      <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 14, marginBottom: 6 }}>Acciones</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
        <Card title="Ver Roster" value="Abrir" onPress={() => nav.navigate("Roster")} />
        <Card title="Generar Roster (AI)" value="Abrir" onPress={() => nav.navigate("RosterGenerate")} />
        <Card title="Habitaciones" value="Abrir" onPress={() => nav.navigate("Rooms")} />
        <Card title="Incidentes" value="Abrir" onPress={() => nav.navigate("Incidents")} />
      </View>
    </ScrollView>
  );
}