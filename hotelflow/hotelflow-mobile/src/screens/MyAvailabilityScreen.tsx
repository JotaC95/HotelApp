// MyAvailabilityScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { getMyAvailability, putMyAvailability } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "MyAvailability">;

type DayRow = { weekday: number; start: string; end: string; unavailable: boolean };
type DayApi = { weekday: number; start?: string | null; end?: string | null; unavailable?: boolean | null };
type AvailabilityApi = { days?: DayApi[] | null };

const WD_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DEFAULT_START = "07:00";
const DEFAULT_END = "15:00";

/** ---- utils ---- */
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

const isValidTime = (t: string) => TIME_REGEX.test(t.trim());

/** Intenta normalizar lo escrito a HH:MM (p.ej. "7"->"07:00", "730"->"07:30") */
const normalizeTime = (raw: string): string => {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 4); // máx 4 dígitos (HHMM)
  if (digits.length === 0) return "";
  if (digits.length <= 2) {
    // Solo horas
    const hh = Math.min(parseInt(digits.padStart(2, "0"), 10), 23);
    return String(hh).padStart(2, "0") + ":00";
  }
  const hh = Math.min(parseInt(digits.slice(0, 2), 10), 23);
  const mm = Math.min(parseInt(digits.slice(2).padEnd(2, "0"), 10), 59);
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
};

const compareTimes = (a: string, b: string) => {
  // devuelve negativo si a<b, 0 si igual, positivo si a>b
  const [ah, am] = a.split(":").map((n) => parseInt(n, 10));
  const [bh, bm] = b.split(":").map((n) => parseInt(n, 10));
  return ah * 60 + am - (bh * 60 + bm);
};

export default function MyAvailabilityScreen({ navigation }: Props) {
  const [rows, setRows] = useState<DayRow[]>(
    Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      start: DEFAULT_START,
      end: DEFAULT_END,
      unavailable: false,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Carga inicial */
  useEffect(() => {
    (async () => {
      try {
        const data: AvailabilityApi = await getMyAvailability(); // { days: [...] }
        if (Array.isArray(data?.days) && data.days.length) {
          const next = Array.from({ length: 7 }, (_, i) => {
            const found = data.days!.find((d) => d.weekday === i);
            return {
              weekday: i,
              start: found?.start && isValidTime(found.start) ? found.start : DEFAULT_START,
              end: found?.end && isValidTime(found.end) ? found.end : DEFAULT_END,
              unavailable: !!found?.unavailable,
            };
          });
          setRows(next);
        }
      } catch (e: any) {
        console.log("load availability error:", e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo cargar tu disponibilidad.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Validaciones por día */
  const errors = useMemo(() => {
    const map = new Map<number, string | null>();
    rows.forEach((r) => {
      if (r.unavailable) {
        map.set(r.weekday, null);
        return;
      }
      if (!isValidTime(r.start)) {
        map.set(r.weekday, "Hora de inicio inválida (usa HH:MM).");
        return;
      }
      if (!isValidTime(r.end)) {
        map.set(r.weekday, "Hora de fin inválida (usa HH:MM).");
        return;
      }
      if (compareTimes(r.start, r.end) >= 0) {
        map.set(r.weekday, "El inicio debe ser anterior al fin.");
        return;
      }
      map.set(r.weekday, null);
    });
    return map;
  }, [rows]);

  const hasErrors = useMemo(() => {
    for (const v of errors.values()) if (v) return true;
    return false;
  }, [errors]);

  /** Payload para guardar */
  const payload = useMemo(
    () => ({
      days: rows.map((r) => ({
        weekday: r.weekday,
        start: r.unavailable ? "" : r.start,
        end: r.unavailable ? "" : r.end,
        unavailable: r.unavailable,
      })),
    }),
    [rows]
  );

  const updateRow = useCallback(
    (idx: number, patch: Partial<DayRow>) => {
      setRows((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      });
    },
    [setRows]
  );

  const onBlurNormalize = useCallback(
    (idx: number, field: "start" | "end") => {
      setRows((prev) => {
        const copy = [...prev];
        const raw = copy[idx][field];
        const norm = normalizeTime(raw);
        copy[idx] = { ...copy[idx], [field]: norm || (field === "start" ? DEFAULT_START : DEFAULT_END) };
        return copy;
      });
    },
    []
  );

  const save = async () => {
    if (hasErrors) {
      Alert.alert("Revisa los datos", "Hay errores en tu disponibilidad. Corrige antes de guardar.");
      return;
    }
    try {
      setSaving(true);
      await putMyAvailability(payload);
      Alert.alert("Listo", "Disponibilidad guardada correctamente");
      navigation.goBack();
    } catch (e: any) {
      console.log("save availability error:", e?.response?.status, e?.response?.data);
      Alert.alert("Error", "No se pudo guardar la disponibilidad");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>Mi disponibilidad semanal</Text>

      {rows.map((row, idx) => {
        const err = errors.get(row.weekday);
        return (
          <View
            key={row.weekday}
            style={{
              borderWidth: 1,
              borderColor: err ? "#ef4444" : "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>{WD_LABELS[row.weekday]}</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text> No disponible todo el día</Text>
              <Switch
                value={row.unavailable}
                onValueChange={(v) => updateRow(idx, { unavailable: v })}
              />
            </View>

            {!row.unavailable && (
              <>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#6b7280", marginBottom: 4 }}>Inicio (HH:MM)</Text>
                    <TextInput
                      value={row.start}
                      onChangeText={(t) => updateRow(idx, { start: t })}
                      onBlur={() => onBlurNormalize(idx, "start")}
                      placeholder={DEFAULT_START}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 8,
                        padding: 10,
                      }}
                      accessibilityLabel={`Hora de inicio ${WD_LABELS[row.weekday]}`}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#6b7280", marginBottom: 4 }}>Fin (HH:MM)</Text>
                    <TextInput
                      value={row.end}
                      onChangeText={(t) => updateRow(idx, { end: t })}
                      onBlur={() => onBlurNormalize(idx, "end")}
                      placeholder={DEFAULT_END}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 8,
                        padding: 10,
                      }}
                      accessibilityLabel={`Hora de fin ${WD_LABELS[row.weekday]}`}
                    />
                  </View>
                </View>

                {!!err && (
                  <Text style={{ color: "#ef4444", marginTop: 8 }}>
                    {err}
                  </Text>
                )}
              </>
            )}
          </View>
        );
      })}

      <Pressable
        onPress={save}
        disabled={saving || hasErrors}
        style={{
          backgroundColor: saving || hasErrors ? "#9ca3af" : "#2563eb",
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {saving ? "Guardando…" : "Guardar"}
        </Text>
      </Pressable>

      {hasErrors && (
        <Text style={{ color: "#ef4444", marginTop: 8 }}>
          Hay errores en uno o más días. Corrígelos para poder guardar.
        </Text>
      )}
    </ScrollView>
  );
}