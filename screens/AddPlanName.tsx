import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function AddPlanName({ route, navigation }: any) {
  const { mode, existingPlan } = route.params || {};
  const isEditMode = mode === 'edit';

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
    <View style={styles.container}>
      <Text style={styles.title}>{isEditMode ? 'Edit Plan' : 'Name Your Plan'}</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="e.g., Morocco & NYC Trip"
          placeholderTextColor="#94A3B8"
          value={planName}
          onChangeText={setPlanName}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !planName && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!planName}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    fontFamily: 'Jua',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
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