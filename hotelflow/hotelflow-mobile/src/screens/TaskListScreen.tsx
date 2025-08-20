import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Button, Alert } from "react-native";
import { getJSON, postForm } from "../api";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import TaskTimer from "../components/TaskTimer";

type Task = {
    id:number;
    title:string;
    status:"PENDING"|"ASSIGNED"|"IN_PROGRESS"|"BLOCKED"|"DONE";
    started_at?: string|null;
    finished_at?: string|null;
};

type Props = NativeStackScreenProps<RootStackParamList, "TaskList">;

export default function TaskListScreen({ route, navigation }: Props) {
    const { roomId } = route.params;
    const [tasks, setTasks] = useState<Task[]>([]);
    const load = () => getJSON<Task[]>(`/housekeeping/tasks/`, { room: roomId }).then(setTasks);
    useEffect(() => { load().catch(console.warn); }, [roomId]);

    const createTask = async () => {
        const fd = new FormData();
        fd.append("room", String(roomId));
        fd.append("title", "Limpieza");
        // CUIDADO: este endpoint espera multipart; por eso usamos postForm
        try {
        await postForm<Task>("/housekeeping/tasks/", fd);
        load();
        } catch (e:any) {
        Alert.alert("Error creando tarea", e?.message ?? String(e));
        }
    };

    return (
        <View style={{ flex:1 }}>
        <Button title="Nueva tarea" onPress={createTask} />
        <FlatList
            data={tasks}
            keyExtractor={t=>String(t.id)}
            renderItem={({item}) => (
            <TouchableOpacity
                onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
                style={{ padding:16, borderBottomWidth:.5 }}
            >
                <Text>{item.title} • {item.status}</Text>
                <TaskTimer startedAt={item.started_at} finishedAt={item.finished_at} />
            </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ padding:16 }}>No hay tareas</Text>}
        />
        </View>
    );
}