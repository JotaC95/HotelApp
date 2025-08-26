// src/screens/IncidentsScreen.tsx
import React from "react";
import { View, Text } from "react-native";

export default function IncidentsScreen() {
    return (
        <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:"800" }}>Incidentes</Text>
        <Text style={{ color:"#6b7280", marginTop:6 }}>Próximamente: cola de revisión, filtros y acciones rápidas.</Text>
        </View>
    );
}