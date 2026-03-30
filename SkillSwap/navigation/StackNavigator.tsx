import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddSkillScreen from '../screens/AddSkillScreen';
import ChatScreen from '../screens/ChatScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import MessagesScreen from '../screens/MessagesScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

import { COLORS } from '../styles/globalStyles';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

// ─── Properly-sized tab icon ────────────────────────────
interface TabIconProps {
  icon: string;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, label, focused }) => (
  <View style={tabStyles.wrap}>
    <Ionicons name={icon} size={24} color={focused ? COLORS.primary : 'rgba(255,255,255,0.4)'} />
    <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
  </View>
);

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    paddingTop: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
    lineHeight: 12,
    textAlign: 'center',
  },
  labelFocused: {
    color: COLORS.primary,
  },
});

// ─── Main Tab Navigator ────────────────────────────────
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#12141C',
        borderTopColor: 'rgba(255,255,255,0.06)',
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 82 : 60,
        paddingTop: 0,
        paddingBottom: Platform.OS === 'ios' ? 22 : 6,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarShowLabel: false,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon={focused ? "home" : "home-outline"} label="Home" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Search"
      component={SearchScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon={focused ? "search" : "search-outline"} label="Search" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagesScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon={focused ? "chatbubble" : "chatbubble-outline"} label="Chat" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="UserProfile"
      component={UserProfileScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon icon={focused ? "person" : "person-outline"} label="Profile" focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

// ─── Root Stack Navigator ──────────────────────────────
const StackNavigator: React.FC = () => {
  const { isDark } = useTheme();
  const { user, loading } = useAuth();
  const bg = isDark ? '#0D0F14' : '#F9FAFB';
  const text = isDark ? '#FFFFFF' : '#11131A';
  const card = isDark ? '#12141C' : '#ffffff';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: card },
        headerTintColor: text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        contentStyle: { backgroundColor: bg },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ route }) => ({ title: route.params.skill.name })}
          />
          <Stack.Screen
            name="AddSkill"
            component={AddSkillScreen}
            options={{ title: 'Add a Skill' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: `Chat with ${route.params.skill.name.split(' ')[0]}`,
              headerShown: false,
            })}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default StackNavigator;
