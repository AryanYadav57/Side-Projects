import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {COLORS, baseStyles} from '../styles/globalStyles';
import {RootStackParamList} from '../types';
import {useTheme} from '../context/ThemeContext';
import {useNotifications} from '../context/NotificationsContext';
import {useAuth} from '../context/AuthContext';
import {hapticLight, hapticMedium} from '../utils/haptics';
import {StatusBar} from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const UserProfileScreen: React.FC<Props> = ({navigation}) => {
  const {theme, toggleTheme, isDark} = useTheme();
  const {clearUnread} = useNotifications();
  const {user, logout} = useAuth();
  const themeColors = COLORS[theme];

  React.useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  // Derive initials from the logged-in user's name
  const initials = user?.name
    ? user.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <SafeAreaView style={[baseStyles.container, {backgroundColor: themeColors.background}]}>
      <StatusBar backgroundColor={themeColors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <Text style={[styles.title, {color: themeColors.text}]}>My Profile</Text>
             <TouchableOpacity onPress={() => { hapticLight(); navigation.goBack(); }}>
               <Text style={[styles.backText, {color: COLORS.primary}]}>Done</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, {color: themeColors.text}]}>{user?.name ?? 'Guest'}</Text>
          <Text style={[styles.email, {color: themeColors.textSecondary}]}>{user?.email ?? ''}</Text>
        </View>

        <View style={[styles.section, {backgroundColor: themeColors.card, borderColor: themeColors.border}]}>
           <Text style={[styles.sectionTitle, {color: themeColors.text}]}>Settings</Text>
           
           <View style={styles.settingRow}>
             <View>
                <Text style={[styles.settingLabel, {color: themeColors.text}]}>Dark Mode</Text>
                <Text style={[styles.settingDesc, {color: themeColors.textSecondary}]}>Toggle application theme</Text>
             </View>
             <Switch 
               value={isDark} 
               onValueChange={toggleTheme} 
               trackColor={{ false: COLORS.light.border, true: COLORS.primary }}
               thumbColor={COLORS.white}
             />
           </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { hapticMedium(); logout(); }}
          activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪  Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    marginBottom: 4,
  },
  college: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
});

export default UserProfileScreen;
