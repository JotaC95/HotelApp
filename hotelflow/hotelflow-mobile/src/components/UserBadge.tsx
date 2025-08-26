import React from "react";
import { Text, View } from "react-native";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types/roles";

function roleLabel(role: UserRole | null): string {
    switch (role) {
        case "SUPERVISOR":
        return "Supervisor";
        case "MAINTENANCE":
        return "Mantenimiento";
        case "FRONTDESK":
        return "Recepción";
        case "CLEANER":
        return "Cleaner";
        default:
        return "—";
    }
}

export default function UserBadge() {
    const { username, role } = useAuth();

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
            {username || "Usuario"}
        </Text>
        <View
            style={{
            backgroundColor: "#eef2ff",
            borderWidth: 1,
            borderColor: "#c7d2fe",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            }}
        >
            <Text style={{ fontSize: 12, color: "#1d4ed8", fontWeight: "700" }}>
            {roleLabel(role)}
            </Text>
        </View>
        </View>
    );
}