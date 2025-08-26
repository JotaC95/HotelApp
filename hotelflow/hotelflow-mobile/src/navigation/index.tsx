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

import LoginScreen from "../screens/LoginScreen";
import RoomsScreen from "../screens/RoomsScreen";
import RoomDetailScreen from "../screens/RoomDetailScreen";
import RosterScreen from "../screens/RosterScreen";
import MyWeekScreen from "../screens/MyWeekScreen";
import MyAvailabilityScreen from "../screens/MyAvailabilityScreen";
import RosterGenerateScreen from "../screens/RosterGenerateScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import FrontdeskScreen from "../screens/FrontdeskScreen";

import UserBadge from "../components/UserBadge";
// ✅ Asegúrate de que exista este archivo en /assets y el path sea correcto:
import Logo from "../../assets/logo.png";

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

// ------------------------
// Header personalizado (2 filas)
// ------------------------
function AppHeader({ navigation, back, options }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const canGoBack = !!back;

  // altura (fila principal) suficientemente alta para un logo grande
  const headerHeight = 76;

  // Ejecutamos headerRight si fue provisto por la pantalla
  const headerRightNode =
    (options as any)?.headerRight?.({ tintColor: undefined }) ?? null;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#fff",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e5e7eb",
      }}
    >
      {/* --- Fila principal: back | logo | salir --- */}
      <View
        style={{
          height: headerHeight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <View style={{ width: 100 }}>
          {canGoBack ? (
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: "#eef2ff",
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Atrás</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ alignItems: "center", flex: 1 }}>
          <Image
            source={Logo}
            resizeMode="contain"
            style={{ width: 200, height: 56 }}
          />
        </View>

        <View style={{ width: 100, alignItems: "flex-end" }}>
          {headerRightNode}
        </View>
      </View>

      {/* --- Fila secundaria: badge de usuario (nombre + rol) --- */}
      <View
        style={{
          backgroundColor: "#f9fafb",
          borderTopWidth: 0.5,
          borderTopColor: "#e5e7eb",
          paddingVertical: 6,
          paddingHorizontal: 16,
          alignItems: "flex-start",
        }}
      >
        <UserBadge />
      </View>
    </View>
  );
}

// Botón Salir para pantallas raíz
const HeaderSignOut = () => {
  const { signOut } = useAuth();
  return (
    <Pressable
      onPress={signOut}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: "#e5e7eb",
      }}
    >
      <Text style={{ color: "#111827", fontWeight: "700" }}>Salir</Text>
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
      <Tabs.Screen name="RosterTab" options={{ title: "Roster" }}>
        {() => (
          <Stack.Navigator
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerRight: () => <HeaderSignOut />,
            }}
          >
            <Stack.Screen name="Roster" component={RosterScreen} />
            <Stack.Screen
              name="RosterGenerate"
              component={RosterGenerateScreen}
              options={{ headerRight: undefined }}
            />
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
    </Tabs.Navigator>
  );
}

function MaintenanceTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="MaintenanceTab"
        component={MaintenanceScreen}
        options={{ title: "Mantenimiento" }}
      />
    </Tabs.Navigator>
  );
}

function FrontdeskTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="FrontdeskTab"
        component={FrontdeskScreen}
        options={{ title: "Recepción" }}
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