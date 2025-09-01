// src/navigation/index.tsx
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackHeaderProps,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types/roles";

// Screens
import LoginScreen from "../screens/LoginScreen";
import RoomsScreen from "../screens/RoomsScreen";
import RoomDetailScreen from "../screens/RoomDetailScreen";
import RosterScreen from "../screens/RosterScreen";
import MyWeekScreen from "../screens/MyWeekScreen";
import MyAvailabilityScreen from "../screens/MyAvailabilityScreen";
import RosterGenerateScreen from "../screens/RosterGenerateScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import FrontdeskScreen from "../screens/FrontdeskScreen";
import SupervisorHomeScreen from "../screens/SupervisorHomeScreen";
import IncidentsScreen from "../screens/IncidentsScreen";

import Logo from "../../assets/logo.png";
import UserBadge from "../components/UserBadge";

// ------------------------
// Tipos de rutas (AÑADIMOS SupervisorHome e Incidents)
// ------------------------
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
  SupervisorHome: undefined;   // <-- NUEVO
  Incidents: undefined;        // <-- NUEVO

  // Maintenance
  Maintenance: undefined;

  // Frontdesk
  Frontdesk: undefined;

  TaskDetail: { taskId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

// ------------------------
// Header personalizado
// ------------------------
function AppHeader({ navigation, back, options }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();

  const canGoBack = !!back;
  const headerHeight = 72;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#fff",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e7eb",
      }}
    >
      <View
        style={{
          height: headerHeight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
        }}
      >
        {/* Izquierda */}
        <View style={{ width: 90 }}>
          {canGoBack ? (
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: "#eef2ff",
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#1d4ed8", fontWeight: "600" }}>Atrás</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Centro: logo + badge */}
        <View style={{ alignItems: "center", flex: 1, gap: 6 }}>
          <Image source={Logo} resizeMode="contain" style={{ width: 140, height: 42 }} />
          <UserBadge />
        </View>

        {/* Derecha: botón que defina cada screen en headerRight */}
        <View style={{ width: 90, alignItems: "flex-end" }}>
          {options.headerRight ? <View>{options.headerRight({ canGoBack })}</View> : null}
        </View>
      </View>
    </View>
  );
}

// Helper: botón Salir
const HeaderSignOut = () => {
  const { signOut } = useAuth();
  return (
    <Pressable
      onPress={signOut}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: "#e5e7eb",
      }}
    >
      <Text style={{ color: "#111827", fontWeight: "600" }}>Salir</Text>
    </Pressable>
  );
};

// ------------------------
// Tabs por rol
// ------------------------
function CleanerTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="RoomsTab" options={{ title: "Habitaciones" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="Rooms" component={RoomsScreen} />
            <Stack.Screen
              name="RoomDetail"
              component={RoomDetailScreen}
              options={{ headerRight: undefined }}
            />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="MyWeekTab" options={{ title: "Mi semana" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="MyWeek" component={MyWeekScreen} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="AvailabilityTab" options={{ title: "Disponibilidad" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="MyAvailability" component={MyAvailabilityScreen} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function SupervisorTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="SupervisorHomeTab" options={{ title: "Inicio" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            {/* Nombres deben existir en RootStackParamList */}
            <Stack.Screen name="SupervisorHome" component={SupervisorHomeScreen} />
            <Stack.Screen
              name="RosterGenerate"
              component={RosterGenerateScreen}
              options={{ headerRight: undefined }}
            />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="RosterTab" options={{ title: "Roster" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="Roster" component={RosterScreen} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="RoomsTab" options={{ title: "Habitaciones" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="Rooms" component={RoomsScreen} />
            <Stack.Screen
              name="RoomDetail"
              component={RoomDetailScreen}
              options={{ headerRight: undefined }}
            />
          </Stack.Navigator>
        )}
      </Tabs.Screen>

      <Tabs.Screen name="IncidentsTab" options={{ title: "Incidentes" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="Incidents" component={IncidentsScreen} />
          </Stack.Navigator>
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function MaintenanceTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="MaintenanceTab"
        options={{ title: "Mantenimiento" }}
        component={MaintenanceScreen}
      />
    </Tabs.Navigator>
  );
}

function FrontdeskTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="FrontdeskTab"
        options={{ title: "Recepción" }}
        component={FrontdeskScreen}
      />
    </Tabs.Navigator>
  );
}

function AppByRole({ role }: { role: UserRole }) {
  if (role === "SUPERVISOR") return <SupervisorTabs />;
  if (role === "MAINTENANCE") return <MaintenanceTabs />;
  if (role === "FRONTDESK") return <FrontdeskTabs />;
  return <CleanerTabs />; // default CLEANER
}

// ------------------------
// Root navigator
// ------------------------
export default function AppNavigator() {
  const { ready, isAuthenticated, role } = useAuth();
  if (!ready) return null;

  return (
    <NavigationContainer>
      {isAuthenticated && role ? (
        <AppByRole role={role} />
      ) : (
        <Stack.Navigator
          screenOptions={{
            header: (props) => <AppHeader {...props} />,
            headerRight: undefined,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}