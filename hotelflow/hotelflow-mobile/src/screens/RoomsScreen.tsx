import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Button } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { getClient } from "../api";
import { useAuth } from "../AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Rooms">;
type Room = { id: number; number: string; floor: number; status: string; zone?: string };

export default function RoomsScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const client = await getClient();
      const res = await client.get<Room[]>("/rooms/");
      setRooms(res.data);
    } catch (e: any) {
      console.log("rooms error:", e?.message, e?.response?.status, e?.response?.data);
      Alert.alert("Error", "No se pudieron cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Habitaciones</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Roster" onPress={() => navigation.navigate("Roster")} />
          <Button title="Salir" onPress={signOut} />
        </View>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(x) => String(x.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRooms} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("RoomDetail", { roomId: item.id })}
            style={{ padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, marginBottom: 8, backgroundColor: "white" }}
          >
            <Text style={{ fontWeight: "700" }}>#{item.number} · {item.status}</Text>
            <Text style={{ color: "#6b7280" }}>
              Piso {item.floor}{item.zone ? ` · ${item.zone}` : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: "#6b7280" }}>No hay habitaciones.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}