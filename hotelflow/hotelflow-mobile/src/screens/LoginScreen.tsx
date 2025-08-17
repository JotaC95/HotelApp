import React from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../AuthContext";
import { makeClient } from "../api";


const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
type Form = z.infer<typeof schema>;

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const { control, handleSubmit } = useForm<Form>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: Form) => {
        try {
        await signIn({ username: data.username, password: data.password });
        const client = await makeClient();
        await client.get("/rooms/"); // valida credenciales
        navigation.replace("Rooms");
        } catch {
        Alert.alert("Error", "Credenciales inválidas o servidor no disponible.");
        }
    };

    const Field = ({name, placeholder, secure=false}: any) => (
        <Controller name={name} control={control} render={({ field:{onChange, value} })=>(
        <TextInput
            placeholder={placeholder}
            autoCapitalize="none"
            secureTextEntry={secure}
            value={value}
            onChangeText={onChange}
            style={{ borderWidth:1, padding:12, borderRadius:8 }}
        />
        )}/>
    );

    return (
        <View style={{ flex:1, padding:24, gap:12, justifyContent:"center" }}>
        <Text style={{ fontSize:20, fontWeight:"600" }}>HotelFlow — Iniciar sesión</Text>
        <Field name="username" placeholder="Usuario" />
        <Field name="password" placeholder="Contraseña" secure />
        <Button title="Entrar" onPress={handleSubmit(onSubmit)} />
        </View>
    );
}