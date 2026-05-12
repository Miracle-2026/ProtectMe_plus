import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [nin, setNin] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('protectme_user');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadSettings = async () => {
      setLoading(false);
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
        Alert.alert('Verified', 'Your identity has been verified successfully');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not verify NIN. Check your connection.');
    } finally {
      setVerifying(false);
    }
  };

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
        <Text style={styles.sectionTitle}>Panic Activation (FR-06)</Text>
        <Text style={styles.sectionSubtitle}>
          Two discreet ways to trigger SOS without opening the app
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Panic Button</Text>
          <Text style={styles.infoValue}>Hold 1.5s on home screen</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Default Protocol</Text>
          <Text style={styles.infoValue}>ARMED / OBSERVATION</Text>
        </View>

        <View style={styles.hintBox}>
        <Text style={styles.hintBoxText}>
          Both triggers default to ARMED protocol to keep responders safe when you cannot interact with your screen.
        </Text>
        </View>
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

      {!user?.is_verified && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification (FR-01)</Text>
          <Text style={styles.sectionSubtitle}>
            Enter your NIN to verify your identity and unlock full community features
          </Text>
          <TextInput
          style={styles.input}
          placeholder="11-digit NIN"
          placeholderTextColor="#666"
          value={nin}
          onChangeText={setNin}
          keyboardType="number-pad"
          maxLength={11}
          />
          <TouchableOpacity
          style={styles.verifyButton}
          onPress={verifyNIN}
          disabled={verifying}
          >
            {verifying
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.verifyButtonText}>Verify Identity</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {user?.is_verified && (
        <View style={styles.section}>
          <View style={styles.verifiedBanner}>
            <Text style={styles.verifiedBannerText}>✓ Identity Verified</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 30, marginTop: 50, letterSpacing: 0.5 },
  section: { marginBottom: 35 },
  sectionTitle: { color: '#e63946', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  sectionSubtitle: { color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  profileCard: { backgroundColor: '#121212', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#e63946', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  profileName: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  profilePhone: { color: '#888', fontSize: 15, fontWeight: '500' },
  verificationBadge: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: 'rgba(26, 92, 26, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1a5c1a' },
  verificationText: { color: '#4ade80', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  input: { backgroundColor: '#121212', color: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222', fontSize: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121212', padding: 16, borderRadius: 12, marginBottom: 8 },
  infoLabel: { color: '#aaa', fontSize: 15, fontWeight: '500' },
  infoValue: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  verifyButton: { backgroundColor: '#e63946', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#e63946', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  verifyButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  verifiedBanner: { backgroundColor: 'rgba(26, 92, 26, 0.15)', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1a5c1a' },
  verifiedBannerText: { color: '#4ade80', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  hintBox: { backgroundColor: 'rgba(230, 57, 70, 0.1)', padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(230, 57, 70, 0.3)' },
  hintBoxText: { color: '#ffb3b3', fontSize: 13, lineHeight: 20, fontWeight: '500' }
});