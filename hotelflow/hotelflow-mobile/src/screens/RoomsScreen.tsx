import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { getClient } from "../api";
import { useAuth } from "../AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Rooms">;
type Room = { id: number; number: string; floor: number; status: string; zone?: string };

const brand = {
  primary: "#2563eb",
  border: "#e5e7eb",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  bg: "#f8fafc",
};

function Chip({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: brand.border,
        backgroundColor: pressed ? "#eef2ff" : brand.card,
      })}
    >
      <Text style={{ color: brand.primary, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

export default function RoomsScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getClient();
      const res = await client.get<Room[]>("/rooms/");
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.log("rooms error:", e?.message, e?.response?.status, e?.response?.data);
      Alert.alert("Error", "No se pudieron cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: brand.bg }}>
      {/* Barra de acciones */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: brand.text }}>Habitaciones</Text>
          <Pressable
            onPress={signOut}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: pressed ? "#1d4ed8" : brand.primary,
            })}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Salir</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          <Chip title="Roster" onPress={() => navigation.navigate("Roster")} />
          <Chip title="Mi semana" onPress={() => navigation.navigate("MyWeek")} />
          <Chip title="Disponibilidad" onPress={() => navigation.navigate("MyAvailability")} />
          <Chip title="Generar roster" onPress={() => navigation.navigate("RosterGenerate")} />
        </View>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(x) => String(x.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRooms} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("RoomDetail", { roomId: item.id })}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: brand.border,
              borderRadius: 14,
              marginBottom: 10,
              backgroundColor: brand.card,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
            }}
          >
            <Text style={{ fontWeight: "800", color: brand.text, marginBottom: 4 }}>
              #{item.number} · {item.status}
            </Text>
            <Text style={{ color: brand.muted }}>
              Piso {item.floor}{item.zone ? ` · ${item.zone}` : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: brand.muted }}>No hay habitaciones.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}