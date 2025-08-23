import React from "react";
import { Image, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types/roles";
import { Ionicons } from "@expo/vector-icons";

// Pantallas
import LoginScreen from "../screens/LoginScreen";
import RoomsScreen from "../screens/RoomsScreen";
import RoomDetailScreen from "../screens/RoomDetailScreen";
import RosterScreen from "../screens/RosterScreen";
import MyWeekScreen from "../screens/MyWeekScreen";
import MyAvailabilityScreen from "../screens/MyAvailabilityScreen";
import RosterGenerateScreen from "../screens/RosterGenerateScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import FrontdeskScreen from "../screens/FrontdeskScreen";

// Logo
const LOGO = require("../../assets/logo.jpg");

// Colores base (puedes mover a un theme central si quieres)
const brand = {
  primary: "#2563eb",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#111827",
  border: "#e5e7eb",
  muted: "#6b7280",
};

// Tema de navegación (colores suaves)
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brand.primary,
    background: brand.background,
    card: brand.card,
    text: brand.text,
    border: brand.border,
  },
};

export type RootStackParamList = {
  Login: undefined;

  // Cleaner
  Rooms: undefined;
  RoomDetail: { roomId: number };
  MyWeek: { monday?: string } | undefined;
  MyAvailability: undefined;

  // Supervisor
  Roster: undefined;
  RosterGenerate: undefined;

  // Maintenance
  Maintenance: undefined;

  // Frontdesk
  Frontdesk: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function HeaderLogoTitle() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image source={LOGO} style={{ width: 26, height: 26, borderRadius: 6 }} resizeMode="contain" />
      <Text style={{ fontWeight: "800", fontSize: 16, color: brand.text }}>HotelFlow</Text>
    </View>
  );
}

function CleanerTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            RoomsTab: "bed-outline",
            MyWeekTab: "calendar-outline",
            AvailabilityTab: "time-outline",
          };
          const name = map[route.name] ?? "ellipse-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
        headerTitle: () => <HeaderLogoTitle />,
        headerTitleAlign: "center",
      })}
    >
      <Tabs.Screen name="RoomsTab" options={{ title: "Habitaciones" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerTitle: () => <HeaderLogoTitle />,
              headerTitleAlign: "center",
            }}
          >
            <Stack.Screen name="Rooms" component={RoomsScreen} options={{ title: "Habitaciones" }} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: "Detalle habitación" }} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="MyWeekTab" options={{ title: "Mi semana" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerTitle: () => <HeaderLogoTitle />,
              headerTitleAlign: "center",
            }}
          >
            <Stack.Screen name="MyWeek" component={MyWeekScreen} options={{ title: "Mi semana" }} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="AvailabilityTab" options={{ title: "Disponibilidad" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerTitle: () => <HeaderLogoTitle />,
              headerTitleAlign: "center",
            }}
          >
            <Stack.Screen name="MyAvailability" component={MyAvailabilityScreen} options={{ title: "Mi disponibilidad" }} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function SupervisorTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            RosterTab: "people-outline",
            RoomsTab: "bed-outline",
          };
          const name = map[route.name] ?? "ellipse-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
        headerTitle: () => <HeaderLogoTitle />,
        headerTitleAlign: "center",
      })}
    >
      <Tabs.Screen name="RosterTab" options={{ title: "Roster" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerTitle: () => <HeaderLogoTitle />,
              headerTitleAlign: "center",
            }}
          >
            <Stack.Screen name="Roster" component={RosterScreen} options={{ title: "Roster / Turnos" }} />
            <Stack.Screen name="RosterGenerate" component={RosterGenerateScreen} options={{ title: "Generar roster (AI)" }} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="RoomsTab" options={{ title: "Habitaciones" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              headerTitle: () => <HeaderLogoTitle />,
              headerTitleAlign: "center",
            }}
          >
            <Stack.Screen name="Rooms" component={RoomsScreen} options={{ title: "Habitaciones" }} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: "Detalle habitación" }} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function MaintenanceTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 6 },
        headerTitle: () => <HeaderLogoTitle />,
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="MaintenanceTab"
        options={{
          title: "Mantenimiento",
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" color={color} size={size} />,
        }}
        component={MaintenanceScreen}
      />
    </Tabs.Navigator>
  );
}

function FrontdeskTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 6 },
        headerTitle: () => <HeaderLogoTitle />,
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="FrontdeskTab"
        options={{
          title: "Recepción",
          tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" color={color} size={size} />,
        }}
        component={FrontdeskScreen}
      />
    </Tabs.Navigator>
  );
}

function AppByRole({ role }: { role: UserRole }) {
  if (role === "SUPERVISOR") return <SupervisorTabs />;
  if (role === "MAINTENANCE") return <MaintenanceTabs />;
  if (role === "FRONTDESK") return <FrontdeskTabs />;
  return <CleanerTabs />;
}

export default function AppNavigator() {
  const { isAuthenticated, role } = useAuth();
  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated && role ? (
        <AppByRole role={role} />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerTitle: () => <HeaderLogoTitle />,
            headerTitleAlign: "center",
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Iniciar sesión" }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}