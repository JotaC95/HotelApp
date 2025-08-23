import React from "react";
import { View, Text } from "react-native";

export default function FrontdeskScreen() {
    return (
        <View style={{ flex:1, padding:16 }}>
        <Text style={{ fontWeight:"700", fontSize:18 }}>Recepción</Text>
        <Text style={{ marginTop:8, color:"#555" }}>
            Aquí irán llegadas/salidas, asignación de habitaciones y comunicación con limpieza.
        </Text>
        </View>
    );
}