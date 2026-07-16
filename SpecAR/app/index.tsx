import { useRouter } from 'expo-router';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useProjectStore, type Project } from '../store/useProjectStore';

export default function HomeScreen() {
  const router = useRouter();
  const { savedProjects, deleteProject, setCurrentDimensions } = useProjectStore();

  const handleDeleteProject = (id: string, name: string) => {
    Alert.alert('Delete Project', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteProject(id),
      },
    ]);
  };

  const handleOpenProject = (project: Project) => {
    setCurrentDimensions(project.dimensions, project.name);
    router.push('/preview');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>SpecAR</Text>
          <Text style={styles.tagline}>AR Furniture Visualizer</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BETA</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroTitle}>
          See Furniture{'\n'}
          <Text style={styles.heroAccent}>Before You Buy</Text>
        </Text>
        <Text style={styles.heroSub}>
          Upload your quotation file and visualize furniture at true 1:1 scale in your actual room.
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/upload')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>+ New Project</Text>
        </TouchableOpacity>
      </View>

      {savedProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>
          <ScrollView style={styles.projectList} showsVerticalScrollIndicator={false}>
            {savedProjects.map((project) => (
              <View key={project.id} style={styles.projectCard}>
                <TouchableOpacity
                  style={styles.projectCardInner}
                  onPress={() => handleOpenProject(project)}
                  activeOpacity={0.8}
                >
                  <View style={styles.projectIcon}>
                    <Text style={styles.projectIconText}>3D</Text>
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectDims}>
                      {project.dimensions.length_cm} x {project.dimensions.width_cm} x{' '}
                      {project.dimensions.height_cm} cm
                    </Text>
                    <Text style={styles.projectDate}>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.projectArrow}>{'>'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteProject(project.id, project.name)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {savedProjects.length === 0 && (
        <View style={styles.pills}>
          {['True 1:1 Scale', 'CSV & JSON Support', '3D Preview', 'Screenshot & Share'].map(
            (feature) => (
              <View key={feature} style={styles.pill}>
                <Text style={styles.pillText}>{feature}</Text>
              </View>
            )
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    letterSpacing: 0,
  },
  badge: {
    backgroundColor: '#7C3AED22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#7C3AED55',
  },
  badgeText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  hero: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C3AED',
    opacity: 0.12,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 44,
    marginBottom: 14,
    letterSpacing: 0,
  },
  heroAccent: {
    color: '#A78BFA',
  },
  heroSub: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  section: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  projectList: {
    flex: 1,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  projectCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#7C3AED22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  projectIconText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '800',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  projectDims: {
    fontSize: 13,
    color: '#A78BFA',
    marginBottom: 2,
  },
  projectDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  projectArrow: {
    fontSize: 18,
    color: '#4B5563',
    fontWeight: '700',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#FF444411',
  },
  deleteBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  pills: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
  },
  pill: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  pillText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
});
