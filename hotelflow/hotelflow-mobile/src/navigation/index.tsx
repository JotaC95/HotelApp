// src/navigation/index.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../AuthContext";

// Pantallas
import LoginScreen from "../screens/LoginScreen";
import RoomsScreen from "../screens/RoomsScreen";
import RoomDetailScreen from "../screens/RoomDetailScreen";
import TaskListScreen from "../screens/TaskListScreen"; 

export type RootStackParamList = {
    Login: undefined;
    Rooms: undefined;
    RoomDetail: { roomId: number };
    TaskList: { roomId: number };       
    TaskDetail: { taskId: number };      
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
                name="TaskList"
                component={TaskListScreen}
                options={{ title: "Tareas de la habitación" }}
            />
            {/*
            <Stack.Screen
                name="TaskDetail"
                component={TaskDetailScreen}
                options={{ title: "Detalle de tarea" }}
            />
            */}
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