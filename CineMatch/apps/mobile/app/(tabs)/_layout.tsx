import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/theme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home-outline' },
  { name: 'search', title: 'Search', icon: 'search-outline' },
  { name: 'cinebot', title: 'CineBot', icon: 'chatbubble-ellipses-outline' },
  { name: 'watchlist', title: 'Watchlist', icon: 'bookmark-outline' },
  { name: 'profile', title: 'Profile', icon: 'person-outline' },
];

function TabBarIcon({ name, color, size, focused }: { name: TabIconName; color: string; size: number; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.iconContainer}>
        <Ionicons name={name} size={size} color={color} />
      </View>
      <View style={[styles.activeDot, focused ? styles.activeDotVisible : styles.activeDotHidden]} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.rosePink,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          {
            bottom: 0,
            height: 62 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        headerShown: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ size, focused }) => (
              <TabBarIcon
                name={tab.icon}
                color={focused ? Colors.rosePink : Colors.textSecondary}
                size={21}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: Colors.tabBarBackground,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: 62,
    overflow: 'hidden',
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  tabBarItem: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  tabBarIcon: {
    marginBottom: 1,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    marginTop: 1,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconContainer: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.rosePink,
  },
  activeDotHidden: {
    opacity: 0,
  },
  activeDotVisible: {
    opacity: 1,
  },
});
