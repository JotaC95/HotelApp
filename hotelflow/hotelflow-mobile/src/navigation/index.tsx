import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../AuthContext";

// Pantallas
import LoginScreen from "../screens/LoginScreen";
import RoomsScreen from "../screens/RoomsScreen";
import RoomDetailScreen from "../screens/RoomDetailScreen";
import RosterScreen from "../screens/RosterScreen";

// Tipado de rutas del stack
export type RootStackParamList = {
  Login: undefined;
  Rooms: undefined;
  RoomDetail: { roomId: number };
  Roster: undefined; // <- incluida
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator>
          <Stack.Screen
            name="Rooms"
            component={RoomsScreen}
            options={{ title: "Habitaciones" }}
          />
          <Stack.Screen
            name="RoomDetail"
            component={RoomDetailScreen}
            options={{ title: "Detalle habitación" }}
          />
          <Stack.Screen
            name="Roster"
            component={RosterScreen}
            options={{ title: "Roster / Turnos" }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Iniciar sesión" }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}