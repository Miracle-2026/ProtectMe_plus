import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';
import { startWardTracking } from '../../utils/wardTracker';

export default function PairingScreen({ navigation }) {
    const [pairingCode, setPairingCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(false);

    const generateCode = async () => {
        setLoading(true);
        console.log("--- GENERATE CODE DIAGNOSTIC ---");
        console.log("1. SERVER_URL is:", SERVER_URL);

        try {
            const token = await AsyncStorage.getItem('protectme_token');
            console.log("2. Token exists:", !!token);

            if (!SERVER_URL) {
                Alert.alert('Code Error', 'SERVER_URL is undefined.');
                setLoading(false);
                return;
            }

            const targetUrl = `${SERVER_URL}/api/geofences/ward/generate-code`;
            console.log("3. Fetching from:", targetUrl);

           const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            console.log("4. Response Status:", response.status);

            const data = await response.json();
            if (response.ok) {
                setPairingCode(data.code);
            } else {
                Alert.alert('Backend Error', data.error || 'Failed to generate code');
            }
        } catch (error) {
            console.error("5. FETCH CRASH:", error.message);
            Alert.alert('Raw Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const linkDevice = async () => {
        if (inputCode.length !== 6) {
            Alert.alert('Error', 'Code must be 6 digits');
            return;
        }
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/geofences/ward/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ code: inputCode })
            });
            
            const data = await response.json();
            if (response.ok) {
                const trackingStarted = await startWardTracking();
                if (trackingStarted) {
                    Alert.alert('Success', 'Device Linked. Background tracking is now active.', [
                        { text: 'OK', onPress: () => navigation.navigate('Home') }
                    ]);
                } else {
                    Alert.alert('Permission Denied', 'Ward tracking requires "Allow All The Time" location permissions to function.');
                }
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Network connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Device Pairing</Text>
            
            {/* GUARDIAN SECTION */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Guardian Mode</Text>
                <Text style={styles.description}>Generate a 6-digit code to link a dependent's device to your Geofence.</Text>
                {pairingCode ? (
                    <Text style={styles.codeDisplay}>{pairingCode}</Text>
                ) : (
                    <TouchableOpacity style={styles.button} onPress={generateCode} disabled={loading}>
                        <Text style={styles.buttonText}>Generate Code</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* WARD SECTION */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Ward Mode</Text>
                <Text style={styles.description}>Enter the 6-digit code provided by your Guardian to activate tracking.</Text>
                <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={inputCode}
                    onChangeText={setInputCode}
                />
                <TouchableOpacity style={[styles.button, styles.wardButton]} onPress={linkDevice} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Link Device</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20, paddingTop: 60 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30 },
    card: { backgroundColor: '#121212', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#e63946', marginBottom: 10 },
    description: { color: '#aaa', fontSize: 14, marginBottom: 20, lineHeight: 20 },
    codeDisplay: { fontSize: 48, fontWeight: 'bold', color: '#4ade80', textAlign: 'center', letterSpacing: 5, marginVertical: 10 },
    input: { backgroundColor: '#1a1a1a', color: '#fff', fontSize: 24, textAlign: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#444', marginBottom: 20, letterSpacing: 5 },
    button: { backgroundColor: '#e63946', padding: 16, borderRadius: 12, alignItems: 'center' },
    wardButton: { backgroundColor: '#3b82f6' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});