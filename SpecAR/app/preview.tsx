import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Table3D from '../components/Table3D';
import { useProjectStore } from '../store/useProjectStore';

export default function PreviewScreen() {
  const router = useRouter();
  const { currentDimensions, currentProjectName } = useProjectStore();

  if (!currentDimensions) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No dimensions loaded.</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'< Go Home'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { length_cm, width_cm, height_cm } = currentDimensions;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backPill}>
          <Text style={styles.backPillText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentProjectName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas} camera={{ position: [1.2, 0.9, 1.2], fov: 55 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 4, 3]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <pointLight position={[-2, 2, -2]} intensity={0.4} color="#A78BFA" />
          <gridHelper args={[4, 16, '#2D2D4E', '#1A1A2E']} position={[0, 0, 0]} />
          <Table3D dimensions={currentDimensions} autoRotate={false} />
          <OrbitControls
            enablePan={false}
            enableZoom
            enableRotate
            minDistance={0.4}
            maxDistance={3}
            target={[0, currentDimensions.height_cm / 200, 0]}
          />
        </Canvas>

        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>Swipe to spin, pinch to zoom</Text>
        </View>
      </View>

      <View style={styles.pills}>
        {[
          { icon: 'L', label: 'Length', val: `${length_cm} cm` },
          { icon: 'W', label: 'Width', val: `${width_cm} cm` },
          { icon: 'H', label: 'Height', val: `${height_cm} cm` },
        ].map((dimension) => (
          <View key={dimension.label} style={styles.pill}>
            <Text style={styles.pillIcon}>{dimension.icon}</Text>
            <Text style={styles.pillLabel}>{dimension.label}</Text>
            <Text style={styles.pillVal}>{dimension.val}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.arButton} onPress={() => router.push('/ar')} activeOpacity={0.85}>
          <Text style={styles.arButtonText}>Place in My Room (AR)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/upload')} style={styles.changeFile}>
          <Text style={styles.changeFileText}>Change File</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backPill: { paddingVertical: 6, paddingHorizontal: 4 },
  backPillText: { color: '#A78BFA', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 70 },
  canvasContainer: { flex: 1, position: 'relative', backgroundColor: '#0D0D1A' },
  canvas: { flex: 1 },
  hintBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: '#00000080',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF11',
  },
  hintText: { color: '#D1D5DB', fontSize: 12 },
  pills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: '#0A0A0F',
  },
  pill: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4E',
    gap: 4,
  },
  pillIcon: { fontSize: 16, color: '#A78BFA', fontWeight: '800' },
  pillLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', letterSpacing: 0 },
  pillVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  footer: { padding: 20, paddingBottom: 32, gap: 12 },
  arButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  arButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  changeFile: { alignItems: 'center', paddingVertical: 8 },
  changeFileText: { color: '#6B7280', fontSize: 14 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  errorText: { color: '#9CA3AF', fontSize: 16 },
  backBtn: { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
