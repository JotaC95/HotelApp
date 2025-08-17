import React from "react";
import { Text, View, ActivityIndicator } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import RoomsScreen from "./src/screens/RoomsScreen";
import { AuthProvider, useAuth } from "./src/AuthContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RoomDetailScreen from "./src/screens/RoomDetailScreen";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { creds, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {creds ? (
        <>
          <Stack.Screen name="Rooms" component={RoomsScreen} options={{ title: "HotelFlow — Rooms" }} />
          <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: "Detalle de habitación" }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown:false }} />
      )}
    </Stack.Navigator>
  );
}

// AuthProvider debe envolver toda la navegación para evitar el error de useContext null.
export default function App() {
  return (
    <AuthProvider>
      {/* AuthProvider debe envolver NavigationContainer */}
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}