import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ListRenderItemInfo,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import SkillCard from '../components/SkillCard';
import {skills as dummySkills} from '../data/dummyData';
import {COLORS, baseStyles} from '../styles/globalStyles';
import {RootStackParamList, Skill, SortOption} from '../types';
import {useTheme} from '../context/ThemeContext';
import {useBookmarks} from '../context/BookmarksContext';
import {useNotifications} from '../context/NotificationsContext';
import {hapticLight, hapticMedium} from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from '../utils/api';
import {useAuth} from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const SORT_OPTIONS: {key: SortOption; label: string; icon: string}[] = [
  {key: 'default',     label: 'Default',         icon: '✦'},
  {key: 'rating_high', label: 'Highest Rated',    icon: '★'},
  {key: 'price_low',   label: 'Price: Low → High', icon: '↑'},
  {key: 'price_high',  label: 'Price: High → Low', icon: '↓'},
];

const extractPrice = (price: string): number =>
  parseInt(price.replace(/[^\d]/g, ''), 10) || 0;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showSortModal, setShowSortModal] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [listType, setListType] = useState<'offering' | 'seeking'>('offering');
  const {theme} = useTheme();
  const {isBookmarked} = useBookmarks();
  const {hasUnread} = useNotifications();
  const {user} = useAuth();
  const themeColors = COLORS[theme];

  // Compute initials from logged-in user's real name
  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  React.useEffect(() => {
    AsyncStorage.getItem('@recent_searches').then(data => {
      if (data) setRecentSearches(JSON.parse(data));
    }).catch(() => {});
  }, []);

  // Fetch skills from backend, fallback to dummy data if it fails
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const data = await api.getSkills();
        if (data && data.length > 0) {
          setSkills(data);
        } else {
          setSkills(dummySkills);
        }
      } catch (e) {
        console.warn('Backend unavailable, using local data.', e);
        setSkills(dummySkills);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const handleSearchSubmit = async (queryToSave: string = searchQuery) => {
    const term = queryToSave.trim();
    if (!term) {
      setShowRecent(false);
      return;
    }
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    setShowRecent(false);
    try {
      await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  const categories = ['All', 'Saved', 'Tech', 'Design', 'Media', 'Writing', 'Music'];

  // Consume newly added skill passed back via route params
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const routes = navigation.getState().routes;
      const homeRoute = routes.find(r => r.name === 'Home');
      const params = homeRoute?.params as {newSkill?: Skill | null} | undefined;
      if (params?.newSkill) {
        setSkills(prev => {
          if (prev.find(s => s.id === params.newSkill!.id)) {return prev;}
          return [params.newSkill!, ...prev];
        });
        navigation.setParams({newSkill: null});
      }
    });
    return unsubscribe;
  }, [navigation]);

  const activeSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Sort';

  const filteredAndSorted = [...skills]
    .filter(skill => {
      const matchesSearch =
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.skill.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = skill.type === listType;

      let matchesCategory = false;
      if (activeCategory === 'All') matchesCategory = true;
      else if (activeCategory === 'Saved') matchesCategory = isBookmarked(skill.id);
      else matchesCategory = skill.category === activeCategory;

      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'rating_high') {return b.rating - a.rating;}
      if (sortBy === 'price_low')  {return extractPrice(a.price) - extractPrice(b.price);}
      if (sortBy === 'price_high') {return extractPrice(b.price) - extractPrice(a.price);}
      return 0;
    });

  const renderHeader = () => (
    <View style={styles.headerBox}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.title}>SkillSwap</Text>
          <Text style={styles.subtitle}>Discover student talent near you</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => { hapticLight(); navigation.navigate('UserProfile'); }}>
            <Text style={styles.profileBtnText}>{userInitials}</Text>
            {hasUnread && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { hapticLight(); navigation.navigate('AddSkill'); }}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, listType === 'offering' && styles.toggleBtnActive]}
          onPress={() => { hapticLight(); setListType('offering'); }}>
          <Text style={[styles.toggleText, listType === 'offering' && styles.toggleTextActive]}>Offering</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, listType === 'seeking' && styles.toggleBtnActive]}
          onPress={() => { hapticLight(); setListType('seeking'); }}>
          <Text style={[styles.toggleText, listType === 'seeking' && styles.toggleTextActive]}>Looking For</Text>
        </TouchableOpacity>
      </View>

      <View style={{zIndex: 10}}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills or names..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowRecent(true)}
            onBlur={() => setTimeout(() => setShowRecent(false), 200)}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowRecent(false); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Searches Dropdown */}
        {showRecent && recentSearches.length > 0 && (
          <View style={[styles.recentDropdown, {backgroundColor: themeColors.card, borderColor: themeColors.border}]}>
            <Text style={[styles.recentTitle, {color: themeColors.textSecondary}]}>Recent Searches</Text>
            {recentSearches.map((term, index) => (
              <TouchableOpacity
                key={`recent-${index}`}
                style={[styles.recentItem, index < recentSearches.length - 1 && {borderBottomWidth: 1, borderBottomColor: themeColors.border}]}
                onPress={() => {
                  hapticLight();
                  setSearchQuery(term);
                  handleSearchSubmit(term);
                }}>
                <Text style={{color: themeColors.textLight, marginRight: 10}}>🕒</Text>
                <Text style={[styles.recentItemText, {color: themeColors.text}]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterPill, {backgroundColor: isActive ? COLORS.primary : themeColors.card}]}
              onPress={() => { hapticLight(); setActiveCategory(cat); }}>
              <Text style={[styles.filterText, {color: isActive ? COLORS.white : themeColors.textSecondary}]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort Button */}
      <TouchableOpacity
        style={[styles.sortBtn, {backgroundColor: themeColors.card, borderColor: themeColors.border}]}
        onPress={() => { hapticLight(); setShowSortModal(true); }}>
        <Text style={[styles.sortBtnText, {color: themeColors.text}]}>⇅</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={[styles.emptyTitle, {color: themeColors.text}]}>No skills found</Text>
      <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>Try a different search or category</Text>
    </View>
  );

  const renderItem = ({item}: ListRenderItemInfo<Skill>) => (
    <SkillCard
      item={item}
      onPress={() => navigation.navigate('Profile', {skill: item})}
    />
  );

  return (
    <SafeAreaView style={[baseStyles.container, {backgroundColor: '#0D0F14'}]} edges={['top']}>
      <StatusBar backgroundColor="#0D0F14" barStyle="light-content" />
      <View style={[baseStyles.container, {backgroundColor: themeColors.background}]}>
          {loading ? (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList<Skill>
              data={filteredAndSorted}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ListHeaderComponent={
                <View>
                  {renderHeader()}
                  {renderFilters()}
                </View>
              }
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              removeClippedSubviews
              maxToRenderPerBatch={6}
              windowSize={7}
              initialNumToRender={5}
              keyboardShouldPersistTaps="handled"
            />
          )}
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalSheet, {backgroundColor: themeColors.card}]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, {color: themeColors.text}]}>Sort Skills</Text>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortOption, {borderColor: themeColors.border}, isActive && {backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary}]}
                  onPress={() => {
                    hapticMedium();
                    setSortBy(opt.key);
                    setShowSortModal(false);
                  }}>
                  <Text style={[styles.sortOptionIcon, {color: isActive ? COLORS.primary : themeColors.textSecondary}]}>{opt.icon}</Text>
                  <Text style={[styles.sortOptionLabel, {color: isActive ? COLORS.primary : themeColors.text}]}>{opt.label}</Text>
                  {isActive && <Text style={styles.sortOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1C23',
    borderWidth: 1.5,
    borderColor: '#272A35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B3B',
    borderWidth: 2,
    borderColor: '#0D0F14',
  },
  addBtn: {
    backgroundColor: '#1E1212',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3D1515',
  },
  addBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1C23',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.white,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  searchContainer: {
    backgroundColor: '#1A1C23',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    padding: 0,
  },
  clearBtn: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  recentDropdown: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
  },
  filterList: {
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sortBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 18, fontWeight: '700', marginBottom: 6},
  emptyText: {fontSize: 14, textAlign: 'center'},
  list: {
    paddingBottom: 40,
  },
  // Sort Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  sortOptionIcon: {fontSize: 18, marginRight: 12, fontWeight: '700'},
  sortOptionLabel: {flex: 1, fontSize: 16, fontWeight: '600'},
  sortOptionCheck: {color: COLORS.primary, fontSize: 18, fontWeight: '800'},
});

export default HomeScreen;
