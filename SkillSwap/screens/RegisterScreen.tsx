import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {COLORS} from '../styles/globalStyles';
import {RootStackParamList} from '../types';
import {useAuth} from '../context/AuthContext';
import {api} from '../utils/api';
import {hapticLight, hapticMedium} from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const {login} = useAuth();

  const handleRegister = async () => {
    hapticMedium();
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const data = await api.register(name.trim(), email.trim(), password);
      await login(data);
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#0D0F14" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <Text style={styles.logoIcon}>⚡</Text>
            </View>
            <Text style={styles.logo}>SkillSwap</Text>
            <Text style={styles.tagline}>Join the community</Text>
          </View>

          {/* Glass Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Create account ✨</Text>
            <Text style={styles.subtitle}>Start sharing and discovering skills</Text>

            <View style={[styles.inputWrap, focused === 'name' && styles.inputFocused]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={[styles.inputWrap, focused === 'email' && styles.inputFocused]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={[styles.inputWrap, focused === 'password' && styles.inputFocused]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Password (min. 6 chars)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && {opacity: 0.7}]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { hapticLight(); navigation.navigate('Login'); }}
              activeOpacity={0.75}>
              <Text style={styles.secondaryBtnText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0F14'},
  scroll: {flexGrow: 1, paddingBottom: 40},
  hero: {alignItems: 'center', paddingTop: 36, paddingBottom: 28},
  logoMark: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoIcon: {fontSize: 32},
  logo: {fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1},
  tagline: {fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: 6},
  card: {
    marginHorizontal: 20,
    backgroundColor: '#1A1C23',
    borderWidth: 1, borderColor: '#272A35',
    borderRadius: 24, padding: 24,
  },
  title: {fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4},
  subtitle: {fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24},
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23',
    borderWidth: 1, borderColor: '#272A35',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 12,
  },
  inputFocused: {borderColor: COLORS.primary},
  inputIcon: {fontSize: 16, marginRight: 10},
  input: {flex: 1, fontSize: 15, color: '#fff', padding: 0},
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  divider: {flexDirection: 'row', alignItems: 'center', marginVertical: 20},
  dividerLine: {flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)'},
  dividerText: {color: 'rgba(255,255,255,0.35)', fontSize: 13, marginHorizontal: 12},
  secondaryBtn: {
    backgroundColor: '#1A1C23',
    borderWidth: 1, borderColor: '#272A35',
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  secondaryBtnText: {color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600'},
});

export default RegisterScreen;
