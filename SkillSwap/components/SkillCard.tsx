import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Skill} from '../types';
import {COLORS} from '../styles/globalStyles';
import {useTheme} from '../context/ThemeContext';
import {useBookmarks} from '../context/BookmarksContext';
import {hapticLight, hapticMedium} from '../utils/haptics';

interface SkillCardProps {
  item: Skill;
  onPress: () => void;
}

type CategoryKey = 'Tech' | 'Design' | 'Media' | 'Writing' | 'Music';

const categoryColors: Record<CategoryKey, {bg: string; text: string}> = {
  Tech:    {bg: '#FFEAEA', text: '#FF3B3B'},
  Design:  {bg: '#FFF0F3', text: '#FF6584'},
  Media:   {bg: '#FFF7E6', text: '#F59E0B'},
  Writing: {bg: '#ECFDF5', text: '#10B981'},
  Music:   {bg: '#EDE9FF', text: '#6C63FF'},
};

const categoryColorsDark: Record<CategoryKey, {bg: string; text: string}> = {
  Tech:    {bg: 'rgba(255,59,59,0.18)',    text: '#FF6B6B'},
  Design:  {bg: 'rgba(255,101,132,0.18)',  text: '#FF8EA4'},
  Media:   {bg: 'rgba(245,158,11,0.18)',   text: '#F5B942'},
  Writing: {bg: 'rgba(16,185,129,0.18)',   text: '#34D399'},
  Music:   {bg: 'rgba(108,99,255,0.18)',   text: '#8B81FF'},
};

const availabilityColors: Record<string, {bg: string; text: string}> = {
  Weekdays: {bg: '#D1FAE5', text: '#059669'},
  Weekends: {bg: '#DBEAFE', text: '#2563EB'},
  Evenings: {bg: '#FEF3C7', text: '#D97706'},
  Flexible: {bg: '#F3E8FF', text: '#7C3AED'},
};

const SkillCard: React.FC<SkillCardProps> = ({item, onPress}) => {
  const {theme} = useTheme();
  const {isBookmarked, toggleBookmark} = useBookmarks();
  const isDark = theme === 'dark';
  const themeColors = COLORS[theme];

  const bookmarked = isBookmarked(item.id);
  const catMap = isDark ? categoryColorsDark : categoryColors;
  const catStyle = catMap[item.category as CategoryKey] ?? {bg: '#F3F4F6', text: '#6B7280'};

  const cardStyle = {
    backgroundColor: themeColors.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? themeColors.border : 'transparent',
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardStyle]}
      onPress={() => { hapticLight(); onPress(); }}
      activeOpacity={0.85}>

      {/* Header: avatar + name + badge */}
      <View style={styles.header}>
        <View style={[styles.avatar, {backgroundColor: catStyle.bg}]}>
          <Text style={[styles.avatarText, {color: catStyle.text}]}>{item.avatar}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, {color: themeColors.text}]}>{item.name}</Text>
          <Text style={[styles.college, {color: themeColors.textSecondary}]}>{item.college}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => { hapticMedium(); toggleBookmark(item); }} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Text style={[styles.bookmark, {color: bookmarked ? COLORS.primary : themeColors.textLight}]}>
              {bookmarked ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.badge, {backgroundColor: catStyle.bg}]}>
            <Text style={[styles.badgeText, {color: catStyle.text}]}>{item.category}</Text>
          </View>
        </View>
      </View>

      {/* Skill title + description */}
      <Text style={[styles.skill, {color: themeColors.text}]}>{item.skill}</Text>
      <Text style={[styles.description, {color: themeColors.textSecondary}]} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Availability tags */}
      {item.availability && item.availability.length > 0 && (
        <View style={styles.tagsRow}>
          {item.availability.map(tag => {
            const tc = availabilityColors[tag] ?? {bg: '#F3F4F6', text: '#6B7280'};
            return (
              <View
                key={tag}
                style={[styles.tag, {backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tc.bg}]}>
                <View style={[styles.tagDot, {backgroundColor: tc.text}]} />
                <Text style={[styles.tagText, {color: isDark ? themeColors.textSecondary : tc.text}]}>
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, {borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : themeColors.border}]}>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={[styles.ratingVal, {color: themeColors.text}]}>{item.rating}</Text>
          <Text style={[styles.ratingMax, {color: themeColors.textLight}]}> / 5.0</Text>
        </View>
        <View style={[styles.priceChip, {backgroundColor: isDark ? 'rgba(255,59,59,0.15)' : COLORS.primary + '18'}]}>
          <Text style={[styles.priceText, {color: COLORS.primary}]}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {fontSize: 14, fontWeight: '800'},
  headerInfo: {flex: 1},
  name: {fontSize: 15, fontWeight: '800', letterSpacing: -0.2},
  college: {fontSize: 12, marginTop: 2},
  headerRight: {alignItems: 'flex-end', gap: 6},
  bookmark: {fontSize: 20},
  badge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20},
  badgeText: {fontSize: 11, fontWeight: '700'},
  skill: {fontSize: 19, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6},
  description: {fontSize: 13, lineHeight: 20, marginBottom: 12},
  tagsRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12},
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  tagDot: {width: 6, height: 6, borderRadius: 3, marginRight: 5},
  tagText: {fontSize: 11, fontWeight: '600'},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  ratingRow: {flexDirection: 'row', alignItems: 'center'},
  star: {fontSize: 14, color: COLORS.warning, marginRight: 4},
  ratingVal: {fontSize: 14, fontWeight: '700'},
  ratingMax: {fontSize: 13},
  priceChip: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20},
  priceText: {fontSize: 14, fontWeight: '800'},
});

export default SkillCard;
