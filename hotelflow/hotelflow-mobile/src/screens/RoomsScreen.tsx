import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    TextInput,
    TouchableOpacity,
    Alert,
} from "react-native";
import { makeClient } from "../api";
import { useAuth } from "../AuthContext";
import { useNavigation } from "@react-navigation/native";


type Room = { id: number; number: string; floor: number; status: string; zone?: string };

function StatusBadge({ status }: { status: string }) {
    const color = useMemo(() => {
        switch (status) {
        case "CLEAN":
            return "#16a34a";
        case "CLEANING":
            return "#f59e0b";
        case "INSPECTION":
            return "#0ea5e9";
        case "OOO":
            return "#6b7280";
        case "DIRTY":
        default:
            return "#ef4444";
        }
    }, [status]);
    return (
        <View
        style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: color + "22",
            borderWidth: 1,
            borderColor: color + "66",
        }}
        >
        <Text style={{ color, fontWeight: "600", fontSize: 12 }}>{status}</Text>
        </View>
    );
}

export default function RoomsScreen() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const { signOut } = useAuth();

    const navigation = useNavigation<any>();

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return rooms;
        return rooms.filter(
        (r) =>
            r.number.toLowerCase().includes(s) ||
            String(r.floor).includes(s) ||
            (r.zone || "").toLowerCase().includes(s) ||
            r.status.toLowerCase().includes(s)
        );
    }, [rooms, q]);

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
        const client = await makeClient();
        const res = await client.get("/rooms/");
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setRooms(data);
        } catch (e) {
        console.error(e);
        Alert.alert("Error", "No se pudo cargar la lista de habitaciones.");
        } finally {
        setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const renderItem = ({ item }: { item: Room }) => (
        <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("RoomDetail", { roomId: item.id })}
        style={{
            padding: 14,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 12,
            marginBottom: 10,
            backgroundColor: "white",
        }}
        // onPress={() => navigation.navigate("RoomDetail", { id: item.id })}
        >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>#{item.number}</Text>
            <StatusBadge status={item.status} />
        </View>
        <Text style={{ color: "#374151" }}>Piso: {item.floor}</Text>
        {!!item.zone && <Text style={{ color: "#6b7280" }}>Zona: {item.zone}</Text>}
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, padding: 12 }}>
        {/* Header con búsqueda y logout */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", flex: 1 }}>Habitaciones</Text>
            <TouchableOpacity onPress={signOut}>
            <Text style={{ color: "#2563eb", fontWeight: "600" }}>Salir</Text>
            </TouchableOpacity>
        </View>

        <TextInput
            placeholder="Buscar por número, piso, zona o estado…"
            value={q}
            onChangeText={setQ}
            style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 10,
            backgroundColor: "white",
            }}
        />

        {/* Lista */}
        <FlatList
            data={filtered}
            keyExtractor={(x) => String(x.id)}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRooms} />}
            ListEmptyComponent={
            !loading ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: "#6b7280" }}>
                    {q ? "No hay coincidencias con tu búsqueda." : "No hay habitaciones aún."}
                </Text>
                </View>
            ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
        />
        </View>
    );
}