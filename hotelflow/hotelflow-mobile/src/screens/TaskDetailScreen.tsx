import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getJSON, postForm } from "../api";
import TaskTimer from "../components/TaskTimer";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type Task = {
    id:number; title:string; status:string;
    started_at?: string|null; finished_at?: string|null;
    dnd_seen?: boolean; service_refused?: boolean;
    start_photo?: string|null; end_photo?: string|null;
    };

type Props = NativeStackScreenProps<RootStackParamList, "TaskDetail">;

export default function TaskDetailScreen({ route, navigation }: Props) {
    const { taskId } = route.params;
    const [task, setTask] = useState<Task | null>(null);
    const load = () => getJSON<Task>(`/housekeeping/tasks/${taskId}/`).then(setTask);
    useEffect(() => { load().catch(console.warn); }, [taskId]);

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (res.canceled) return null;
        const a = res.assets[0];
        return { uri: a.uri, name: a.fileName ?? "photo.jpg", type: a.mimeType ?? "image/jpeg" };
    };

    // START CHECK: respeta tus reglas -> foto opcional; si DND => foto obligatoria
    const startCheck = async (flags:{ dnd?:boolean; refused?:boolean }) => {
        const fd = new FormData();
        if (flags.dnd) fd.append("dnd_seen", "true");
        if (flags.refused) fd.append("service_refused", "true");

        // Si hay DND, exigir foto como evidencia
        if (flags.dnd) {
        const img = await pickImage();
        if (!img) { Alert.alert("Falta foto", "Debes adjuntar una imagen como prueba del letrero DND."); return; }
        fd.append("start_photo", img as any);
        }

        try {
        await postForm<Task>(`/housekeeping/tasks/${taskId}/start_check/`, fd);
        await load();
        } catch (e:any) {
        Alert.alert("Error start_check", e?.message ?? String(e));
        }
    };

    const finishTask = async () => {
        const fd = new FormData();
        // No obligamos foto final a menos que hayas indicado lo contrario
        // (si quisieras condicionar, puedes pedirla aquí según flags del negocio)
        // fd.append("end_photo", img as any);

        try {
        await postForm<Task>(`/housekeeping/tasks/${taskId}/finish/`, fd); // <-- si tu backend no tiene /finish, cámbialo por PATCH/PUT estándar
        await load();
        Alert.alert("Listo", "Tarea finalizada");
        navigation.goBack();
        } catch (e:any) {
        Alert.alert("Error al finalizar", e?.message ?? String(e));
        }
    };

    if (!task) return <View style={{ padding:16 }}><Text>Cargando...</Text></View>;

    return (
        <View style={{ padding:16, gap:12 }}>
        <Text style={{ fontSize:18, fontWeight:"600" }}>{task.title}</Text>
        <Text>Estado: {task.status}</Text>
        <TaskTimer startedAt={task.started_at} finishedAt={task.finished_at} />

        {task.start_photo ? <Image source={{ uri: task.start_photo }} style={{ width:160, height:160 }} /> : null}

        <Button title="Iniciar (normal)" onPress={() => startCheck({})} />
        <Button title="No molestar (DND)" onPress={() => startCheck({ dnd:true })} />
        <Button title="Servicio rechazado" onPress={() => startCheck({ refused:true })} />
        <Button title="Finalizar tarea" onPress={finishTask} />
        </View>
    );
}