import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useProjectStore, type Dimensions } from '../store/useProjectStore';
import { formatDimensionsSummary, parseDimensionFile } from '../utils/parser';

type Step = 'idle' | 'parsing' | 'confirm';

export default function UploadScreen() {
  const router = useRouter();
  const { setCurrentDimensions, saveProject } = useProjectStore();

  const [step, setStep] = useState<Step>('idle');
  const [fileName, setFileName] = useState('');
  const [parsedDims, setParsedDims] = useState<Dimensions | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const baseName = asset.name.replace(/\.[^.]+$/, '');
      setFileName(asset.name);
      setStep('parsing');
      setParseErrors([]);

      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = parseDimensionFile(content, asset.mimeType ?? '');

      if (parsed.success && parsed.dimensions) {
        setParsedDims(parsed.dimensions);
        setCurrentDimensions(parsed.dimensions, baseName);
        setProjectName(baseName);
        setStep('confirm');
        return;
      }

      const errors = parsed.errors ?? ['Unknown error parsing file.'];
      setParseErrors(errors);
      setStep('idle');
      Alert.alert('Could Not Parse File', errors.join('\n'), [{ text: 'OK' }]);
    } catch (error) {
      setStep('idle');
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to read file.');
    }
  };

  const handleConfirm = () => {
    if (!parsedDims) return;
    saveProject(projectName || 'My Project', fileName);
    router.push('/preview');
  };

  const handleBack = () => {
    setStep('idle');
    setParsedDims(null);
    setFileName('');
    setParseErrors([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Quotation</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {step === 'idle' && (
          <>
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>Supported Formats</Text>
              <Text style={styles.guideText}>
                Upload a <Text style={styles.accent}>CSV</Text> or{' '}
                <Text style={styles.accent}>JSON</Text> file containing furniture dimensions. The
                file must include <Text style={styles.accent}>length</Text>,{' '}
                <Text style={styles.accent}>width</Text>, and{' '}
                <Text style={styles.accent}>height</Text> fields.
              </Text>

              <View style={styles.divider} />

              <Text style={styles.guideTitle}>CSV Example</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.code}>
                  field,value,unit{'\n'}length,120,cm{'\n'}width,60,cm{'\n'}height,75,cm
                  {'\n'}top_thickness,4,cm{'\n'}leg_thickness,5,cm
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.guideTitle}>Units Supported</Text>
              <Text style={styles.guideText}>cm, mm, inches, feet, meters</Text>
            </View>

            {parseErrors.length > 0 && (
              <View style={styles.errorCard}>
                {parseErrors.map((error) => (
                  <Text key={error} style={styles.errorText}>
                    {error}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile} activeOpacity={0.8}>
              <Text style={styles.uploadIcon}>File</Text>
              <Text style={styles.uploadTitle}>Choose File</Text>
              <Text style={styles.uploadSub}>CSV or JSON</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'parsing' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text style={styles.loadingText}>Parsing {fileName}...</Text>
          </View>
        )}

        {step === 'confirm' && parsedDims && (
          <>
            <View style={styles.successBanner}>
              <Text style={styles.successIcon}>OK</Text>
              <View>
                <Text style={styles.successTitle}>Dimensions Detected</Text>
                <Text style={styles.successFile}>{fileName}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Project Name</Text>
              <TextInput
                style={styles.textInput}
                value={projectName}
                onChangeText={setProjectName}
                placeholder="e.g. Living Room Table"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.dimsCard}>
              <Text style={styles.dimsCardTitle}>Parsed Dimensions</Text>
              {[
                { label: 'Length', value: parsedDims.length_cm, unit: 'cm' },
                { label: 'Width', value: parsedDims.width_cm, unit: 'cm' },
                { label: 'Height', value: parsedDims.height_cm, unit: 'cm' },
                { label: 'Top Thickness', value: parsedDims.top_thickness_cm, unit: 'cm' },
                { label: 'Leg Thickness', value: parsedDims.leg_thickness_cm, unit: 'cm' },
                { label: 'Leg Style', value: parsedDims.leg_style, unit: '' },
              ].map((row) => (
                <View key={row.label} style={styles.dimRow}>
                  <Text style={styles.dimLabel}>{row.label}</Text>
                  <Text style={styles.dimValue}>
                    {row.value} {row.unit}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>At true 1:1 scale in AR</Text>
              <Text style={styles.summaryValue}>{formatDimensionsSummary(parsedDims)}</Text>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmText}>{'View 3D Preview >'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
              <Text style={styles.retryText}>Upload Different File</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  backBtn: { padding: 4 },
  backText: { color: '#A78BFA', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 70 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  guideCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  guideTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  guideText: { color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
  accent: { color: '#A78BFA', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#2D2D4E', marginVertical: 16 },
  codeBlock: {
    backgroundColor: '#0A0A0F',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  code: { color: '#86EFAC', fontFamily: 'monospace', fontSize: 12, lineHeight: 20 },
  errorCard: {
    backgroundColor: '#451A1A',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, lineHeight: 20 },
  uploadButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7C3AED55',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  uploadIcon: { color: '#A78BFA', fontSize: 16, fontWeight: '800' },
  uploadTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 8 },
  uploadSub: { color: '#6B7280', fontSize: 14 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 20 },
  loadingText: { color: '#9CA3AF', fontSize: 16 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  successIcon: { color: '#86EFAC', fontSize: 14, fontWeight: '800' },
  successTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  successFile: { color: '#86EFAC', fontSize: 13, marginTop: 2 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0 },
  textInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D4E',
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dimsCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  dimsCardTitle: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 16, letterSpacing: 0 },
  dimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4E',
  },
  dimLabel: { color: '#9CA3AF', fontSize: 14 },
  dimValue: { color: '#A78BFA', fontSize: 14, fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#7C3AED22',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7C3AED55',
    alignItems: 'center',
  },
  summaryLabel: { color: '#A78BFA', fontSize: 12, fontWeight: '600', letterSpacing: 0, marginBottom: 6 },
  summaryValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 0 },
  confirmButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  retryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryText: { color: '#6B7280', fontSize: 15 },
});
