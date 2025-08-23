import React from "react";
import { View, Text } from "react-native";


export default function MaintenanceScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontWeight:"700", fontSize:18 }}>Mantenimiento</Text>
      <Text style={{ marginTop:8, color:"#555" }}>
        Aquí irán las órdenes de trabajo, estado de incidencias y asignaciones de mantenimiento.
      </Text>
    </View>
  );
}