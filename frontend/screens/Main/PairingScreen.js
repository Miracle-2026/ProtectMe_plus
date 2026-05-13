import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';
import { startWardTracking } from '../../utils/wardTracker';

export default function PairingScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [pairingCode, setPairingCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('protectme_user');
                console.log("DEBUG: Stored User Data:", userData);
                
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    if (parsedUser.role) {
                        setUser(parsedUser);
                    } else {
                        console.error("ERROR: User found but ROLE is missing!");
                    }
                }
            } catch (e) {
                console.error("Failed to load user from storage", e);
            }
        };
        loadUser();
    }, []);

    const generateCode = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/geofences/ward/generate-code`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const data = await response.json();
            if (response.ok) {
                setPairingCode(data.code);
            } else if (response.status === 401) {
                Alert.alert('Session Expired', 'Please log out and log back in.');
            } else {
                Alert.alert('Error', data.error || 'Failed to generate pairing code');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Check your server IP in config.js.');
        } finally {
            setLoading(false);
        }
    };

    const linkDevice = async () => {
        if (inputCode.length !== 6) {
            Alert.alert('Error', 'Verification code must be 6 digits.');
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
                    Alert.alert('Success', 'Device Linked.', [
                        { text: 'OK', onPress: () => navigation.navigate('Home') }
                    ]);
                } else {
                    Alert.alert('Permission Required', 'Ward monitoring requires "Always Allow" location.');
                }
            } else {
                Alert.alert('Invalid Code', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Connection failed.');
        } finally {
            setLoading(false);
        }
    };

    // UI for missing data (Escape Hatch)
    if (!user || !user.role) {
        return (
            <View style={styles.errorContainer}>
                <ActivityIndicator size="large" color="#e63946" />
                <Text style={styles.errorText}>Verifying account role...</Text>
                <TouchableOpacity 
                    style={{marginTop: 20}} 
                    onPress={async () => {
                        await AsyncStorage.clear();
                        navigation.replace('Login');
                    }}
                >
                    <Text style={{color: '#e63946'}}>Reset Session</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Device Linking</Text>
            
            {user.role === 'guardian' && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Guardian Console</Text>
                    <Text style={styles.description}>Generate a code to monitor a ward's device.</Text>
                    {pairingCode ? (
                        <View>
                            <Text style={styles.codeDisplay}>{pairingCode}</Text>
                            <Text style={styles.hint}>Valid for 15 minutes</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.button} onPress={generateCode} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Pairing Code</Text>}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {user.role === 'ward' && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Ward Activation</Text>
                    <Text style={styles.description}>Enter the 6-digit code provided by your Guardian.</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="000000"
                        placeholderTextColor="#444"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={inputCode}
                        onChangeText={setInputCode}
                    />
                    <TouchableOpacity style={[styles.button, styles.wardButton]} onPress={linkDevice} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Activate Protection</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20, paddingTop: 60 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
    errorText: { color: '#666', marginTop: 10 },
    header: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 30 },
    card: { backgroundColor: '#121212', padding: 24, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#e63946', marginBottom: 10 },
    description: { color: '#888', fontSize: 14, marginBottom: 25 },
    codeDisplay: { fontSize: 52, fontWeight: '900', color: '#4ade80', textAlign: 'center', letterSpacing: 8 },
    hint: { color: '#444', fontSize: 12, textAlign: 'center' },
    input: { backgroundColor: '#050505', color: '#fff', fontSize: 32, textAlign: 'center', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#333', marginBottom: 25 },
    button: { backgroundColor: '#e63946', padding: 18, borderRadius: 15, alignItems: 'center' },
    wardButton: { backgroundColor: '#3b82f6' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});