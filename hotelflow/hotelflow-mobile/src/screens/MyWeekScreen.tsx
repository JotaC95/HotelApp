import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Button, FlatList, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { getClient } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "MyWeek">;

type DayRow = {
  date: string;
  shift: null | {
    start: string;
    end: string;
    zone: string | null;
    team: string | null;
    planned_minutes: number;
  };
  team_members: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
  }[];
  tasks: {
    task_id: number;
    title: string;
    room: number | null;
    planned_start: string | null;
    planned_end: string | null;
  }[];
};

function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const delta = day === 0 ? -6 : 1 - day; // mover al lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() + delta);
  return monday.toISOString().slice(0, 10);
}

export default function MyWeekScreen({}: Props) {
  const [mondayDate, setMondayDate] = useState(startOfWeekMonday(new Date()));
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
  setLoading(true);
  try {
    const c = await getClient();
    const r = await c.get<{ days: DayRow[] }>("/scheduling/my_week", {
      params: { monday: mondayDate }, // 👈 pasamos mondayDate como parámetro
    });
    setRows(r.data.days || []);
  } finally {
    setLoading(false);
  }
}, [mondayDate]);

  useEffect(() => {
    load();
  }, [load]);

  const gotoPrev = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() - 7);
    setMondayDate(d.toISOString().slice(0, 10));
  };

  const gotoNext = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + 7);
    setMondayDate(d.toISOString().slice(0, 10));
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Button title="« Semana" onPress={gotoPrev} />
          <Text style={{ fontWeight: "800", alignSelf: "center" }}>
            Mi semana (Lunes {mondayDate})
          </Text>
        <Button title="Semana »" onPress={gotoNext} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.date}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              marginBottom: 8,
              backgroundColor: "white",
            }}
          >
            <Text style={{ fontWeight: "700", marginBottom: 4 }}>
              {new Date(item.date + "T00:00:00").toLocaleDateString(
                undefined,
                { weekday: "long", day: "2-digit", month: "short" }
              )}
            </Text>

            {item.shift ? (
              <>
                <Text>
                  Turno: {item.shift.start}–{item.shift.end} · Zona:{" "}
                  {item.shift.zone ?? "—"} · Equipo: {item.shift.team ?? "—"}
                </Text>

                {!!item.team_members.length && (
                  <Text style={{ color: "#6b7280", marginTop: 2 }}>
                    Compañeros:{" "}
                    {item.team_members
                      .map((m) => m.first_name || m.username)
                      .join(", ")}
                  </Text>
                )}

                {!!item.tasks.length ? (
                  <View style={{ marginTop: 6 }}>
                    {item.tasks.map((t) => (
                      <Text key={t.task_id} style={{ color: "#374151" }}>
                        • {t.title}
                        {t.room ? ` (#${t.room})` : ""}{" "}
                        {t.planned_start
                          ? ` ${t.planned_start.slice(11, 16)}–${
                              t.planned_end?.slice(11, 16) ?? ""
                            }`
                          : ""}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: "#9ca3af", marginTop: 6 }}>
                    Sin tareas planificadas
                  </Text>
                )}
              </>
            ) : (
              <Text style={{ color: "#9ca3af" }}>Libre / Sin turno</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ padding: 16, color: "#9ca3af" }}>No hay datos.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}