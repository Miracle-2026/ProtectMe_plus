import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Switch,
  TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [nin, setNin] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [mapVisibility, setMapVisibility] = useState(true);

  useEffect(() => {
    loadUser();
    loadBackendSettings();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('protectme_user');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadBackendSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const response = await fetch(`${SERVER_URL}/api/settings`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await response.json();
      if (response.ok) {
        setWakeWordEnabled(data.settings.wake_word_enabled);
        setMapVisibility(data.settings.map_visibility);
      }
    } catch (error) {
      console.error('Settings load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const response = await fetch(`${SERVER_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ [key]: value })
      });
      if (!response.ok) throw new Error();
    } catch (error) {
      Alert.alert('Error', 'Preference sync failed.');
    }
  };

  const verifyNIN = async () => {
    if (!nin || nin.length !== 11) {
      Alert.alert('Error', 'Please enter your 11-digit NIN');
      return;
    }
    setVerifying(true);
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const response = await fetch(`${SERVER_URL}/api/auth/verify-nin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ nin })
      });
      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('protectme_user', JSON.stringify(data.user));
        setUser(data.user);
        setNin('');
        Alert.alert('Verified', 'Identity confirmed successfully.');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#e63946" /></View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profilePhone}>{user?.phone_number}</Text>
          <View style={[styles.badge, user?.is_verified ? styles.verifiedBadge : styles.pendingBadge]}>
            <Text style={styles.badgeText}>{user?.is_verified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Triggers</Text>
        
        {}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <Text style={styles.settingLabel}>Voice Activation (FR-06)</Text>
            <Text style={styles.settingDesc}>Trigger SOS via "Help ProtectMe"</Text>
          </View>
          <Switch 
            value={wakeWordEnabled} 
            onValueChange={(val) => { setWakeWordEnabled(val); updatePreference('wake_word_enabled', val); }} 
            trackColor={{ true: '#e63946' }}
          />
        </View>

        {}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <Text style={styles.settingLabel}>Community Map (FR-07)</Text>
            <Text style={styles.settingDesc}>Appear on map to nearby responders</Text>
          </View>
          <Switch 
            value={mapVisibility} 
            onValueChange={(val) => { setMapVisibility(val); updatePreference('map_visibility', val); }} 
            trackColor={{ true: '#e63946' }}
          />
        </View>
      </View>

      {!user?.is_verified && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verify Identity (FR-01)</Text>
          <TextInput
            style={styles.input}
            placeholder="11-digit NIN"
            placeholderTextColor="#666"
            value={nin}
            onChangeText={setNin}
            keyboardType="number-pad"
            maxLength={11}
          />
          <TouchableOpacity style={styles.button} onPress={verifyNIN} disabled={verifying}>
            {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify via NIN</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Protocol</Text>
        <View style={styles.infoBox}><Text style={styles.infoText}>Data Encrypted with AES-256 (NFR-02)</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 30, marginTop: 50 },
  section: { marginBottom: 35 },
  sectionTitle: { color: '#e63946', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  profileCard: { backgroundColor: '#121212', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  profileName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  profilePhone: { color: '#888', fontSize: 14, marginTop: 4 },
  badge: { marginTop: 15, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start' },
  verifiedBadge: { backgroundColor: 'rgba(74, 222, 128, 0.1)' },
  pendingBadge: { backgroundColor: 'rgba(230, 57, 70, 0.1)' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121212', padding: 18, borderRadius: 16, marginBottom: 10 },
  settingLabelGroup: { flex: 1 },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  settingDesc: { color: '#666', fontSize: 12, marginTop: 2 },
  input: { backgroundColor: '#121212', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  button: { backgroundColor: '#e63946', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  infoBox: { backgroundColor: '#111', padding: 15, borderRadius: 12, alignItems: 'center' },
  infoText: { color: '#444', fontSize: 12, fontWeight: '700' }
});