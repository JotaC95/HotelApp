// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Button, Text, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../AuthContext";

export default function LoginScreen() {
    const { signIn } = useAuth();
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) return;
        try {
        setLoading(true);
        await signIn(username.trim(), password);
        // La navegación cambia automáticamente porque isAuthenticated pasa a true
        } finally {
        setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        >
        <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 12 }}>HotelFlow</Text>

            <TextInput
            placeholder="Usuario"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setU}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />

            <TextInput
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setP}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />

            <View style={{ marginTop: 8 }}>
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Button
                    title="Entrar"
                    onPress={async () => {
                        try {
                        await signIn(username, password);  // <- ahora sí esperamos al login
                        } catch {
                        // el AuthContext ya lanza Alert, no necesitas nada más aquí
                        }
                    }}
                />
            )}
            </View>
        </View>
        </KeyboardAvoidingView>
    );
}