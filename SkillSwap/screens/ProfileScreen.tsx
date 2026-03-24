import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, baseStyles } from '../styles/globalStyles';
import { RootStackParamList, Project } from '../types';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const projectTypeColors: Record<Project['type'], { bg: string; text: string }> = {
  'College Project': { bg: '#DBEAFE', text: '#2563EB' },
  'Freelance': { bg: '#D1FAE5', text: '#059669' },
  'Personal': { bg: '#F3E8FF', text: '#7C3AED' },
  'Open Source': { bg: '#FEF3C7', text: '#D97706' },
};

const availabilityColors: Record<string, { bg: string; text: string }> = {
  Weekdays: { bg: '#D1FAE5', text: '#059669' },
  Weekends: { bg: '#DBEAFE', text: '#2563EB' },
  Evenings: { bg: '#FEF3C7', text: '#D97706' },
  Flexible: { bg: '#F3E8FF', text: '#7C3AED' },
};

const ProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { skill } = route.params;
  const { theme } = useTheme();
  const themeColors = COLORS[theme];
  const isDark = theme === 'dark';

  const featuredProject = skill.portfolio?.find(p => p.featured);
  const otherProjects = skill.portfolio?.filter(p => !p.featured) ?? [];

  return (
    <View style={[baseStyles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor={isDark ? '#0D0F14' : COLORS.primary} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Banner */}
        <View style={styles.banner}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{skill.avatar}</Text>
          </View>
          <Text style={styles.name}>{skill.name}</Text>
          <Text style={styles.college}>{skill.college}</Text>

          {/* Availability Tags */}
          {skill.availability && skill.availability.length > 0 && (
            <View style={styles.availabilityRow}>
              {skill.availability.map((tag) => {
                const col = availabilityColors[tag] ?? { bg: 'rgba(255,255,255,0.2)', text: COLORS.white };
                return (
                  <View key={tag} style={[styles.availabilityTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <View style={[styles.availabilityDot, { backgroundColor: COLORS.white }]} />
                    <Text style={styles.availabilityText}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{skill.rating} rating</Text>
          </View>
        </View>

        {/* Skill Description Card */}
        <View style={[styles.card, {backgroundColor: themeColors.card, borderWidth: isDark ? 1 : 0, borderColor: isDark ? themeColors.border : 'transparent'}]}>
          <Text style={styles.skillTitle}>{skill.skill}</Text>
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>{skill.description}</Text>
        </View>

        {/* Details Card */}
        <View style={[styles.card, {backgroundColor: themeColors.card, borderWidth: isDark ? 1 : 0, borderColor: isDark ? themeColors.border : 'transparent'}]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Details</Text>
          <DetailRow label="Category" value={skill.category} textColor={themeColors.text} labelColor={themeColors.textSecondary} borderColor={themeColors.border} />
          <DetailRow label="Rate" value={skill.price} textColor={themeColors.text} labelColor={themeColors.textSecondary} borderColor={themeColors.border} />
          <DetailRow label="Rating" value={`${skill.rating} / 5.0`} textColor={themeColors.text} labelColor={themeColors.textSecondary} borderColor={themeColors.border} />
          <DetailRow label="College" value={skill.college} textColor={themeColors.text} labelColor={themeColors.textSecondary} borderColor={themeColors.border} />
        </View>

        {/* Portfolio Section */}
        {skill.portfolio && skill.portfolio.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📁 Portfolio</Text>

            {/* Featured Project */}
            {featuredProject && (
              <View style={[styles.featuredProject, { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' }]}>
                <View style={styles.featuredHeader}>
                  <Text style={styles.featuredLabel}>📌 Featured</Text>
                  <View style={styles.projectTypeBadge}>
                    <Text style={[styles.projectTypeBadgeText, { color: projectTypeColors[featuredProject.type].text }]}>{featuredProject.type}</Text>
                  </View>
                </View>
                <Text style={[styles.projectTitle, { color: themeColors.text }]}>{featuredProject.title}</Text>
                <Text style={[styles.projectDesc, { color: themeColors.textSecondary }]}>{featuredProject.description}</Text>
                <View style={styles.toolsRow}>
                  {featuredProject.tools.map(tool => (
                    <View key={tool} style={[styles.toolChip, { backgroundColor: themeColors.background }]}>
                      <Text style={[styles.toolText, { color: themeColors.textSecondary }]}>{tool}</Text>
                    </View>
                  ))}
                </View>
                {featuredProject.link && (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => { hapticLight(); Linking.openURL(featuredProject.link!); }}>
                    <Text style={styles.linkBtnText}>View Project ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Other Projects */}
            {otherProjects.map((project) => {
              const typeColor = projectTypeColors[project.type];
              return (
                <View key={project.id} style={[styles.projectCard, { borderColor: themeColors.border }]}>
                  <View style={styles.projectCardHeader}>
                    <Text style={[styles.projectTitle, { color: themeColors.text, flex: 1 }]}>{project.title}</Text>
                    <View style={[styles.projectTypeBadge, { backgroundColor: isDark ? themeColors.background : typeColor.bg + '60' }]}>
                      <Text style={[styles.projectTypeBadgeText, { color: typeColor.text }]}>{project.type}</Text>
                    </View>
                  </View>
                  <Text style={[styles.projectDesc, { color: themeColors.textSecondary }]}>{project.description}</Text>
                  <View style={styles.toolsRow}>
                    {project.tools.map(tool => (
                      <View key={tool} style={[styles.toolChip, { backgroundColor: themeColors.background }]}>
                        <Text style={[styles.toolText, { color: themeColors.textSecondary }]}>{tool}</Text>
                      </View>
                    ))}
                  </View>
                  {project.link && (
                    <TouchableOpacity onPress={() => { hapticLight(); Linking.openURL(project.link!); }}>
                      <Text style={[styles.smallLink, { color: COLORS.primary }]}>View →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => { hapticLight(); navigation.navigate('Chat', { skill }); }}>
            <Text style={styles.chatBtnText}>💬  Start Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => { hapticLight(); navigation.goBack(); }}>
            <Text style={[styles.backBtnText, { color: themeColors.text }]}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  textColor: string;
  labelColor: string;
  borderColor: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, textColor, labelColor, borderColor }) => (
  <View style={[styles.detailRow, { borderBottomColor: borderColor }]}>
    <Text style={[styles.detailLabel, { color: labelColor }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: textColor }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: 4, letterSpacing: -0.5 },
  college: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  availabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  availabilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  availabilityDot: {
    width: 6, height: 6, borderRadius: 3, marginRight: 5, opacity: 0.9,
  },
  availabilityText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  star: { fontSize: 14, color: '#FFD700', marginRight: 5 },
  rating: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  skillTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 8, letterSpacing: -0.5 },
  description: { fontSize: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '700' },
  // Portfolio
  featuredProject: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  projectCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  projectTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  projectDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  projectTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  projectTypeBadgeText: { fontSize: 10, fontWeight: '700' },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  toolChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  toolText: { fontSize: 12, fontWeight: '600' },
  linkBtn: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  linkBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  smallLink: { fontSize: 13, fontWeight: '700' },
  actionsContainer: { paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  chatBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  chatBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  backBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  backBtnText: { fontSize: 15, fontWeight: '600' },
});

export default ProfileScreen;
