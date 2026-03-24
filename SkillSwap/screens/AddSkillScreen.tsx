import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {COLORS, baseStyles} from '../styles/globalStyles';
import {RootStackParamList, Skill} from '../types';
import {useTheme} from '../context/ThemeContext';
import {hapticLight, hapticSuccess, hapticError} from '../utils/haptics';
import {api} from '../utils/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSkill'>;

const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Evenings', 'Flexible'];

const AddSkillScreen: React.FC<Props> = ({navigation}) => {
  const [name, setName]               = useState<string>('');
  const [skill, setSkill]             = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice]             = useState<string>('');
  const [college, setCollege]         = useState<string>('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {theme} = useTheme();
  const themeColors = COLORS[theme];

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim() || !skill.trim() || !description.trim() || !price.trim()) {
      hapticError();
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (availability.length === 0) {
      hapticError();
      Alert.alert('Availability Required', 'Please select at least one availability option.');
      return;
    }

    const initials = name
      .trim()
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const skillPayload = {
      name: name.trim(),
      skill: skill.trim(),
      description: description.trim(),
      price: price.trim().startsWith('₹') ? price.trim() : `₹${price.trim()}/hr`,
      rating: 0,
      avatar: initials,
      category: 'Tech',
      college: college.trim() || 'Your College',
      type: 'offering',
      availability,
      portfolio: [],
    };

    try {
      const savedSkill = await api.createSkill(skillPayload);
      hapticSuccess();
      navigation.navigate('Home', {newSkill: {...skillPayload, id: savedSkill._id ?? Date.now().toString(), type: skillPayload.type as 'offering' | 'seeking'}});
    } catch (e) {
      console.warn('Could not save to backend, saving locally.', e);
      hapticSuccess();
      navigation.navigate('Home', {newSkill: {...skillPayload, id: Date.now().toString(), type: skillPayload.type as 'offering' | 'seeking'}});
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      color: themeColors.text
    },
    focusedField === field && {
      borderColor: COLORS.primary,
      backgroundColor: themeColors.primaryLight,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[baseStyles.container, {backgroundColor: themeColors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor={themeColors.background} barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>List Your Skill</Text>
          <Text style={styles.bannerSubtitle}>Help fellow students discover what you offer</Text>
        </View>

        <View style={[styles.formCard, {backgroundColor: themeColors.card}]}>
          <Text style={[styles.label, {color: themeColors.textSecondary}]}>Full Name *</Text>
          <TextInput
            style={inputStyle('name')}
            placeholder="e.g. Aryan Mehta"
            placeholderTextColor={themeColors.textLight}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[styles.label, {color: themeColors.textSecondary}]}>Skill / Service *</Text>
          <TextInput
            style={inputStyle('skill')}
            placeholder="e.g. Web Development, UI Design"
            placeholderTextColor={themeColors.textLight}
            value={skill}
            onChangeText={setSkill}
            onFocus={() => setFocusedField('skill')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[styles.label, {color: themeColors.textSecondary}]}>College / University</Text>
          <TextInput
            style={inputStyle('college')}
            placeholder="e.g. NMIMS University"
            placeholderTextColor={themeColors.textLight}
            value={college}
            onChangeText={setCollege}
            onFocus={() => setFocusedField('college')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[styles.label, {color: themeColors.textSecondary}]}>Rate (per hour) *</Text>
          <TextInput
            style={inputStyle('price')}
            placeholder="e.g. 150 or ₹150/hr"
            placeholderTextColor={themeColors.textLight}
            value={price}
            onChangeText={setPrice}
            onFocus={() => setFocusedField('price')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[styles.label, {color: themeColors.textSecondary}]}>Description *</Text>
          <TextInput
            style={[inputStyle('description'), styles.textArea]}
            placeholder="Describe your skill and experience..."
            placeholderTextColor={themeColors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={[styles.label, {color: themeColors.textSecondary}]}>Availability *</Text>
          <View style={styles.availabilityContainer}>
            {AVAILABILITY_OPTIONS.map((opt) => {
              const isSelected = availability.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.availabilityPill,
                    {backgroundColor: isSelected ? COLORS.primary : themeColors.background, borderColor: isSelected ? COLORS.primary : themeColors.border}
                  ]}
                  onPress={() => {
                    hapticLight();
                    setAvailability(prev => 
                      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                    );
                  }}>
                  <Text style={[styles.availabilityText, {color: isSelected ? COLORS.white : themeColors.textSecondary}]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>✓  Submit Listing</Text>
          </TouchableOpacity>

          <TouchableOpacity 
             style={[styles.cancelBtn, {borderColor: themeColors.border}]} 
             onPress={() => { hapticLight(); navigation.goBack(); }}>
            <Text style={[styles.cancelBtnText, {color: themeColors.textSecondary}]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  bannerTitle: {
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.white, 
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  bannerSubtitle: {fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500'},
  formCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 30,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {height: 100, paddingTop: 12},
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  availabilityPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
  },
  cancelBtnText: {fontSize: 15, fontWeight: '600'},
});

export default AddSkillScreen;
