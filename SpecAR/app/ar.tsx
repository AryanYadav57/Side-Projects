import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  Alert,
  Dimensions as RNDimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Table3D from '../components/Table3D';
import { useProjectStore } from '../store/useProjectStore';

const SCREEN_W = RNDimensions.get('window').width;
const SCREEN_H = RNDimensions.get('window').height;

function DimensionLabel({ label, value }: { label: string; value: string }) {
  return (
    <View style={labelStyles.container}>
      <Text style={labelStyles.label}>{label}</Text>
      <Text style={labelStyles.value}>{value}</Text>
    </View>
  );
}

const labelStyles = StyleSheet.create({
  container: {
    backgroundColor: '#7C3AEDcc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#A78BFA66',
  },
  label: { color: '#C4B5FD', fontSize: 10, fontWeight: '600', letterSpacing: 0 },
  value: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

export default function ARScreen() {
  const router = useRouter();
  const { currentDimensions, currentProjectName } = useProjectStore();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [modelScale, setModelScale] = useState(0.8);
  const [modelX, setModelX] = useState(0);
  const [modelY, setModelY] = useState(0);
  const [modelRotY, setModelRotY] = useState(0);

  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastTwoFingersAngle = useRef<number | null>(null);
  const sceneRef = useRef<View>(null);

  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
    if (!mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [cameraPermission?.granted, mediaPermission?.granted, requestCameraPermission, requestMediaPermission]);

  const getTouchDist = (t1: { pageX: number; pageY: number }, t2: { pageX: number; pageY: number }) => {
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (t1: { pageX: number; pageY: number }, t2: { pageX: number; pageY: number }) =>
    Math.atan2(t2.pageY - t1.pageY, t2.pageX - t1.pageX);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        lastPan.current = { x: gestureState.x0, y: gestureState.y0 };
        lastPinchDist.current = null;
        lastTwoFingersAngle.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dist = getTouchDist(t1, t2);
          if (lastPinchDist.current !== null) {
            const delta = dist / lastPinchDist.current;
            setModelScale((prev) => Math.min(Math.max(prev * delta, 0.2), 5));
          }
          lastPinchDist.current = dist;

          const angle = getTouchAngle(t1, t2);
          if (lastTwoFingersAngle.current !== null) {
            setModelRotY((prev) => prev + angle - lastTwoFingersAngle.current!);
          }
          lastTwoFingersAngle.current = angle;
          return;
        }

        if (touches.length === 1) {
          const nextX = gestureState.moveX;
          const nextY = gestureState.moveY;
          setModelX((prev) => prev + nextX - lastPan.current.x);
          setModelY((prev) => prev + nextY - lastPan.current.y);
          lastPan.current = { x: nextX, y: nextY };
        }
      },
      onPanResponderRelease: () => {
        lastPinchDist.current = null;
        lastTwoFingersAngle.current = null;
      },
    })
  ).current;

  const handleScreenshot = useCallback(async () => {
    if (!sceneRef.current) return;
    try {
      const uri = await captureRef(sceneRef, { format: 'jpg', quality: 0.92 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Saved', 'Screenshot saved to your photo library.');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to capture screenshot.');
    }
  }, []);

  if (!currentDimensions) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorText}>No furniture loaded.</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>SpecAR needs camera access to show furniture in your room.</Text>
        <TouchableOpacity onPress={requestCameraPermission} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorSecondary}>
          <Text style={styles.errorSecondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { length_cm, width_cm, height_cm } = currentDimensions;
  const xShift = (modelX / SCREEN_W) * 1.6;
  const yShift = -(modelY / SCREEN_H) * 1.6;

  return (
    <View style={styles.container} ref={sceneRef}>
      <CameraView style={styles.absoluteFill} facing="back" />

      <View style={styles.absoluteFill} {...panResponder.panHandlers} pointerEvents="box-only">
        <Canvas style={styles.absoluteFill} camera={{ position: [xShift, yShift + 0.6, 1.4], fov: 65 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 3]} intensity={1.2} />
          <pointLight position={[-2, 3, -2]} intensity={0.3} color="#A78BFA" />
          <group rotation={[0, modelRotY, 0]}>
            <Table3D dimensions={currentDimensions} autoRotate={false} scale={modelScale} />
          </group>
        </Canvas>
      </View>

      <View style={styles.topHud} pointerEvents="box-none">
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <View style={styles.projectBadge}>
          <Text style={styles.projectBadgeText} numberOfLines={1}>
            {currentProjectName}
          </Text>
        </View>

        <TouchableOpacity style={styles.screenshotBtn} onPress={handleScreenshot}>
          <Text style={styles.screenshotText}>Shot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dimLabels} pointerEvents="none">
        <DimensionLabel label="LENGTH" value={`${length_cm} cm`} />
        <DimensionLabel label="WIDTH" value={`${width_cm} cm`} />
        <DimensionLabel label="HEIGHT" value={`${height_cm} cm`} />
      </View>

      <View style={styles.gestureGuide} pointerEvents="none">
        <View style={styles.gestureRow}>
          <View style={styles.gesturePill}>
            <Text style={styles.gesturePillText}>Drag to move</Text>
          </View>
          <View style={styles.gesturePill}>
            <Text style={styles.gesturePillText}>Pinch to resize</Text>
          </View>
          <View style={styles.gesturePill}>
            <Text style={styles.gesturePillText}>Twist to rotate</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  topHud: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF22',
  },
  closeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  projectBadge: {
    backgroundColor: '#00000088',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF22',
    maxWidth: 180,
  },
  projectBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  screenshotBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#7C3AEDcc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A78BFA66',
    paddingHorizontal: 8,
  },
  screenshotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  dimLabels: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 16,
    gap: 8,
  },
  gestureGuide: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gestureRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  gesturePill: {
    backgroundColor: '#00000088',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#FFFFFF22',
  },
  gesturePillText: { color: '#E5E7EB', fontSize: 12 },
  errorScreen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  errorText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  errorBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  errorBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  errorSecondary: { paddingVertical: 8 },
  errorSecondaryText: { color: '#6B7280', fontSize: 15 },
});
