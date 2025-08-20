import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/AuthContext";
import AppNavigator from "./src/navigation";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}