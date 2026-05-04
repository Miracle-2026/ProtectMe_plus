import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function SettingsScreen({ navigation }) {
  const [wakeWord, setWakeWord] = useState('help protectme');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadSettings();
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('protectme_user');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const response = await fetch(`${SERVER_URL}/api/settings`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await response.json();
      if (response.ok) {
        setWakeWord(data.settings.wake_word);
        setWakeWordEnabled(data.settings.wake_word_enabled);
      }
    } catch (error) {
      console.error('Load settings error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const response = await fetch(`${SERVER_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          wake_word: wakeWord,
          wake_word_enabled: wakeWordEnabled
        })
      });
      if (response.ok) {
        Alert.alert('Saved', 'Your settings have been updated');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{user ? user.full_name : 'User'}</Text>
          <Text style={styles.profilePhone}>{user ? user.phone_number : ''}</Text>
          <View style={styles.verificationBadge}>
            <Text style={styles.verificationText}>
              {user && user.is_verified ? '✓ Verified' : '⚠ Pending Verification'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Activation (FR-06)</Text>
        <Text style={styles.sectionSubtitle}>
          Say your wake word to trigger SOS hands-free
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enable Wake Word</Text>
          <Switch
            value={wakeWordEnabled}
            onValueChange={setWakeWordEnabled}
            trackColor={{ false: '#333', true: '#e63946' }}
            thumbColor={wakeWordEnabled ? '#ffffff' : '#666'}
          />
        </View>

        <Text style={styles.inputLabel}>Your Wake Word / Phrase</Text>
        <TextInput
          style={[styles.input, !wakeWordEnabled && styles.inputDisabled]}
          value={wakeWord}
          onChangeText={setWakeWord}
          placeholder="e.g. help protectme"
          placeholderTextColor="#666"
          editable={wakeWordEnabled}
        />
        <Text style={styles.hint}>
          Default: "help protectme" — Choose something natural but unique.
          When triggered by voice, ARMED/OBSERVATION protocol activates automatically.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Password Encryption</Text>
          <Text style={styles.infoValue}>bcrypt (cost 12)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>NIN Encryption</Text>
          <Text style={styles.infoValue}>AES-256</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Session Token</Text>
          <Text style={styles.infoValue}>JWT (7 days)</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveSettings}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveButtonText}>Save Settings</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e63946', marginBottom: 24, marginTop: 10 },
  section: { marginBottom: 28 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  sectionSubtitle: { color: '#666', fontSize: 13, marginBottom: 14 },
  profileCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  profilePhone: { color: '#aaa', fontSize: 14, marginTop: 4 },
  verificationBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  verificationText: { color: '#aaa', fontSize: 12 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  toggleLabel: { color: '#ffffff', fontSize: 15 },
  inputLabel: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 15,
    marginBottom: 10
  },
  inputDisabled: { opacity: 0.4 },
  hint: { color: '#555', fontSize: 12, lineHeight: 18 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a'
  },
  infoLabel: { color: '#aaa', fontSize: 14 },
  infoValue: { color: '#e63946', fontSize: 14, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#e63946',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});