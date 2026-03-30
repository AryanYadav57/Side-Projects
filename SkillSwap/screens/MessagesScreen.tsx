import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {COLORS} from '../styles/globalStyles';
import {RootStackParamList, Skill} from '../types';
import {skills as dummySkills} from '../data/dummyData';

type Props = NativeStackScreenProps<RootStackParamList, 'Messages'>;

// Show first 4 skills as "conversations" (demo)
const conversations = dummySkills.slice(0, 4);

const MessagesScreen: React.FC<Props> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#0D0F14" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={{padding: 16}}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({item}: {item: Skill}) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Chat', {skill: item})}
            activeOpacity={0.75}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.avatar}</Text>
            </View>
            {/* Info */}
            <View style={styles.info}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>10:0{item.id} AM</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.skill} · {item.college}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Start a chat from any skill listing</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0F14'},
  header: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4},
  title: {fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {fontSize: 18, fontWeight: '700', color: '#fff'},
  info: {flex: 1},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  name: {fontSize: 16, fontWeight: '700', color: '#fff'},
  time: {fontSize: 12, color: 'rgba(255,255,255,0.4)'},
  preview: {fontSize: 14, color: 'rgba(255,255,255,0.5)'},
  empty: {flex: 1, alignItems: 'center', paddingTop: 80},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8},
  emptyText: {fontSize: 15, color: 'rgba(255,255,255,0.5)'},
});

export default MessagesScreen;
