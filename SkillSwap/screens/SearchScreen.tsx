import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {COLORS} from '../styles/globalStyles';
import {Skill, RootStackParamList} from '../types';
import {skills as dummySkills} from '../data/dummyData';
import SkillCard from '../components/SkillCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const SearchScreen: React.FC<Props> = ({navigation}) => {
  const [query, setQuery] = useState('');

  const filtered = query.trim().length > 1
    ? dummySkills.filter(
        s =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.skill.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const renderItem = ({item}: ListRenderItemInfo<Skill>) => (
    <SkillCard
      item={item}
      onPress={() => navigation.navigate('Profile', {skill: item})}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#0D0F14" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills or names..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length < 2 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>Discover Skills</Text>
          <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptyText}>Try a different keyword</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 30}}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0F14'},
  header: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4},
  title: {fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 12,
    backgroundColor: '#1A1C23',
    borderWidth: 1,
    borderColor: '#272A35',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  clearBtn: {color: 'rgba(255,255,255,0.5)', fontSize: 16, paddingLeft: 8},
  emptyState: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8},
  emptyText: {fontSize: 15, color: 'rgba(255,255,255,0.5)'},
});

export default SearchScreen;
