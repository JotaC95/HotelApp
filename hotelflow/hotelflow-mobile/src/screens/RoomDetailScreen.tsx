import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
} from "react-native";
import { makeClient } from "../api";

type Room = { id:number; number:string; floor:number; status:string; zone?:string };

type Task = {
    id:number;
    title:string;
    description:string;
    task_type:"TURNOVER"|"INSPECTION"|"DEEP_CLEAN"|"OTHER";
    priority:"LOW"|"MEDIUM"|"HIGH";
    status:"PENDING"|"ASSIGNED"|"IN_PROGRESS"|"DONE";
    room:number;
    assigned_to?: number | null;
};

export default function RoomDetailScreen({ route }: any) {
    const { roomId } = route.params as { roomId: number };

    const [room, setRoom] = useState<Room | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // modal crear tarea
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");

    const statusColor = useMemo(() => {
        switch (room?.status) {
        case "CLEAN": return "#16a34a";
        case "CLEANING": return "#f59e0b";
        case "INSPECTION": return "#0ea5e9";
        case "OOO": return "#6b7280";
        default: return "#ef4444"; // DIRTY u otros
        }
    }, [room]);

    /**
     * Carga habitación y tareas desde el backend
     * GET /api/housekeeping/rooms/{id}/
     * GET /api/housekeeping/tasks/?room={roomId}
     */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
        const client = await makeClient();

        // Detalle habitación
        const r = await client.get(`/rooms/${roomId}/`);
        setRoom(r.data);

        // Tareas de la habitación (si el backend no filtra por query, hacemos filtro local)
        const t = await client.get(`/tasks/`, { params: { room: roomId } });
        const raw = Array.isArray(t.data) ? t.data : t.data.results || [];
        const onlyThisRoom: Task[] = raw.filter((x: Task) => x.room === roomId);
        setTasks(onlyThisRoom);
        } catch (e: any) {
        console.log("detail error:", e?.message, e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo cargar el detalle de la habitación.");
        } finally {
        setLoading(false);
        }
    }, [roomId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /**
     * Crear tarea rápida
     * POST /api/housekeeping/tasks/
     */
    const createQuickTask = useCallback(async () => {
        try {
        if (!title.trim()) {
            Alert.alert("Falta título", "Escribe un título para la tarea.");
            return;
        }
        const client = await makeClient();
        const payload = {
            title,
            description: "",
            task_type: "TURNOVER",
            priority: "MEDIUM",
            status: "PENDING",
            room: roomId,
        };
        const res = await client.post(`/tasks/`, payload);
        setCreating(false);
        setTitle("");
        setTasks((prev) => [res.data as Task, ...prev]);
        Alert.alert("Listo", "Tarea creada.");
        } catch (e: any) {
        console.log("create task error:", e?.message, e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo crear la tarea.");
        }
    }, [roomId, title]);

    /**
     * Alternar estado (DONE <-> PENDING)
     * PATCH /api/housekeeping/tasks/{id}/
     */
    const toggleTaskStatus = useCallback(async (task: Task) => {
        try {
        const next = task.status === "DONE" ? "PENDING" : "DONE";
        const client = await makeClient();
        const res = await client.patch(`/tasks/${task.id}/`, { status: next });
        const updated: Task = res.data;

        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        } catch (e: any) {
        console.log("toggle task error:", e?.message, e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo actualizar la tarea.");
        }
    }, []);

    /**
     * Eliminar tarea (opcional)
     * DELETE /api/housekeeping/tasks/{id}/
     */
    const removeTask = useCallback(async (task: Task) => {
        try {
        const client = await makeClient();
        await client.delete(`/tasks/${task.id}/`);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        } catch (e: any) {
        console.log("delete task error:", e?.message, e?.response?.status, e?.response?.data);
        Alert.alert("Error", "No se pudo eliminar la tarea.");
        }
    }, []);

    const renderTask = ({ item }: { item: Task }) => {
        const isDone = item.status === "DONE";
        return (
        <View
            style={{
            padding: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 12,
            marginBottom: 8,
            backgroundColor: "white",
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontWeight: "700", opacity: isDone ? 0.5 : 1 }}>
                {item.title}
            </Text>
            <Text style={{ color: "#6b7280" }}>{item.priority}</Text>
            </View>
            <Text style={{ color: "#374151", marginBottom: 8 }}>
            Estado: {item.status} · Tipo: {item.task_type}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
                onPress={() => toggleTaskStatus(item)}
                style={{
                backgroundColor: isDone ? "#f59e0b" : "#16a34a",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>
                {isDone ? "Marcar pendiente" : "Marcar DONE"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => removeTask(item)}
                style={{
                backgroundColor: "#ef4444",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Eliminar</Text>
            </TouchableOpacity>
            </View>
        </View>
        );
    };

    return (
        <View style={{ flex: 1, padding: 12 }}>
        {/* Header habitación */}
        <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
            Habitación #{room?.number ?? roomId}
            </Text>
            {room && (
            <>
                <Text style={{ color: "#374151" }}>Piso: {room.floor}</Text>
                {!!room.zone && <Text style={{ color: "#6b7280" }}>Zona: {room.zone}</Text>}
                <View
                style={{
                    marginTop: 6,
                    alignSelf: "flex-start",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: statusColor + "22",
                    borderWidth: 1,
                    borderColor: statusColor + "66",
                }}
                >
                <Text style={{ color: statusColor, fontWeight: "600" }}>{room.status}</Text>
                </View>
            </>
            )}
        </View>

        {/* Acciones */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <TouchableOpacity
            onPress={() => setCreating(true)}
            style={{
                backgroundColor: "#2563eb",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
            }}
            >
            <Text style={{ color: "white", fontWeight: "600" }}>+ Tarea rápida</Text>
            </TouchableOpacity>
            <TouchableOpacity
            onPress={fetchAll}
            style={{
                backgroundColor: "#e5e7eb",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
            }}
            >
            <Text style={{ color: "#111827", fontWeight: "600" }}>Actualizar</Text>
            </TouchableOpacity>
        </View>

        {/* Lista de tareas */}
        <FlatList
            data={tasks}
            keyExtractor={(x) => String(x.id)}
            renderItem={renderTask}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
            ListEmptyComponent={
            !loading ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: "#6b7280" }}>Sin tareas todavía.</Text>
                </View>
            ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
        />

        {/* Modal crear tarea */}
        <Modal
            visible={creating}
            animationType="slide"
            transparent
            onRequestClose={() => setCreating(false)}
        >
            <View style={{ flex: 1, backgroundColor: "#0006", justifyContent: "center", padding: 20 }}>
            <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "700" }}>Nueva tarea rápida</Text>
                <TextInput
                placeholder="Título de la tarea"
                value={title}
                onChangeText={setTitle}
                style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                }}
                />
                <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                <TouchableOpacity onPress={() => setCreating(false)}>
                    <Text style={{ fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={createQuickTask}
                    style={{
                    backgroundColor: "#2563eb",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Crear</Text>
                </TouchableOpacity>
                </View>
            </View>
            </View>
        </Modal>
        </View>
    );
}