import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

export default function AddPlanName({ route, navigation }: any) {
  const { mode, existingPlan } = route.params || {};
  const isEditMode = mode === 'edit';
  const { colors, isDark } = useTheme();

  const [planName, setPlanName] = useState(
    isEditMode && existingPlan ? existingPlan.name : ''
  );

  const handleContinue = () => {
    if (planName.trim()) {
      navigation.navigate('AddTrips', {
        planName,
        mode: isEditMode ? 'edit' : 'create',
        existingPlanId: isEditMode && existingPlan ? existingPlan.id : undefined
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ────── Custom Header ────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditMode ? 'Edit Plan' : 'Create New Plan'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Name Your Plan</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="e.g., Morocco & NYC Trip"
          placeholderTextColor={colors.subtext}
          value={planName}
          onChangeText={setPlanName}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          !planName && styles.buttonDisabled,
          !planName && isDark && { backgroundColor: colors.surface }
        ]}
        onPress={handleContinue}
        disabled={!planName}
      >
        <Text style={[styles.buttonText, !planName && isDark && { color: colors.subtext }]}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 18,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  input: {
    fontFamily: 'Jua',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1F4259',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },
});