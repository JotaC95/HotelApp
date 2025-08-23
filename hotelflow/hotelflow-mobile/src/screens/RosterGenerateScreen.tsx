import React, { useState } from "react";
import { View, Text, Button, Alert, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { generateRosterAI } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "RosterGenerate">;

export default function RosterGenerateScreen({ navigation }: Props) {
  const [busy, setBusy] = useState(false);

  // DEMO: entradas mínimas (ajústalo o cárgalo desde tu API)
  const week_start = "2025-08-25";
  const rooms_summary = [
    { date: "2025-08-25", vacant: 10, stayovers: 6, deep: 1, zone: "North" },
    { date: "2025-08-26", vacant: 7,  stayovers: 8, deep: 0, zone: "South" },
    { date: "2025-08-27", vacant: 12, stayovers: 4, deep: 1, zone: "Central" },
  ];
  const availability = [
    { user_id: 3, days: [{ weekday:0, start:"07:00", end:"15:00" }, { weekday:1, start:"07:00", end:"15:00" }, { weekday:2, start:"08:00", end:"16:00" }]},
    { user_id: 5, days: [{ weekday:0, start:"08:00", end:"16:00" }, { weekday:1, start:"09:00", end:"17:00" }, { weekday:2, start:"07:00", end:"15:00" }]},
  ];
  const rules = { start_window: ["07:00", "10:00"], team_size: 2, shift_minutes: 480 };

  const callAI = async (dry_run: boolean) => {
    try {
      setBusy(true);
      const payload = { week_start, rooms_summary, availability, rules, dry_run };
      const res = await generateRosterAI(payload);
      if (dry_run) {
        Alert.alert("Simulación", "Plan recibido. Revisa consola.");
        console.log("AI dry_run plan:", res);
      } else {
        Alert.alert("OK", "Roster generado");
        console.log("AI persisted:", res);
        navigation.goBack();
      }
    } catch (e: any) {
      console.log("ai gen error:", e?.response?.status, e?.response?.data);
      Alert.alert("Error", "No se pudo generar el roster");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>Generar roster (AI)</Text>
      <Text style={{ color: "#6b7280" }}>
        Usaremos disponibilidad + resumen de carga. Primero simula (dry run), luego genera.
      </Text>

      <Button title={busy ? "Simulando…" : "Simular (no guarda)"} onPress={() => callAI(true)} disabled={busy} />
      <Button title={busy ? "Generando…" : "Generar (guardar DB)"} onPress={() => callAI(false)} disabled={busy} />
    </ScrollView>
  );
}