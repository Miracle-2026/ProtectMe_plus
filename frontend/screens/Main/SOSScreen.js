import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { addToQueue } from '../../utils/offlineQueue';
import * as Linking from 'expo-linking';

import { SERVER_URL } from '../../config';

export default function SOSScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        getLocation();
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected && state.isInternetReachable);
        });
        return () => unsubscribe();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required for SOS transmission.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            setLocation(loc.coords);
        } catch (error) {
            console.error('Location error:', error.message);
        }
    };

    const triggerSOS = async (threatType) => {
        if (!location) {
            Alert.alert('Error', 'Wait for GPS lock before sending alert.');
            getLocation();
            return;
        }

        setLoading(true);
        const token = await AsyncStorage.getItem('protectme_token');

        const sosPayload = {
            threat_type: threatType,
            latitude: location.latitude,
            longitude: location.longitude,
            address: 'GPS-acquired coordinates'
        };

        if (!isConnected) {
            await addToQueue(sosPayload);
            Alert.alert('SOS Queued', 'No internet. Alert will send automatically when online.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/sos/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(sosPayload)
            });

            const data = await response.json();

            if (response.ok) {
                const { startHeartbeat } = require('../../utils/heartbeatSender');
                await startHeartbeat(data.sos.id);
                
                Alert.alert(
                    'SOS Broadcasted ✓',
                    `Alert sent. Response Protocol: ${data.sos.protocol === 'OBSERVATION' ? 'OBSERVE ONLY' : 'ASSISTANCE REQUESTED'}.`,
                    [
                        { text: 'Call Emergency (112)', onPress: () => Linking.openURL('tel:112') },
                        { text: 'I am Safe', onPress: () => navigation.goBack(), style: 'cancel' }
                    ]
                );
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            await addToQueue(sosPayload);
            Alert.alert('SOS Queued', 'Connection failed. Alert saved to queue.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Emergency SOS</Text>
            <Text style={styles.subtitle}>Specify the threat level immediately</Text>

            {}
            

            {!isConnected && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠️ OFFLINE: SOS will be queued locally</Text>
                </View>    
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#e63946" style={{ marginTop: 60 }} />
            ) : (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.threatButton, styles.armedButton]}
                        onPress={() => triggerSOS('ARMED')}
                    >
                        <Text style={styles.threatButtonIcon}>⚠️</Text>
                        <Text style={styles.threatButtonText}>ARMED THREAT</Text>
                        <Text style={styles.buttonDesc}>PROTOCOL: OBSERVATION ONLY</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.threatButton, styles.unarmedButton]}
                        onPress={() => triggerSOS('UNARMED')}
                    >
                        <Text style={styles.threatButtonIcon}>🆘</Text>
                        <Text style={styles.threatButtonText}>UNARMED THREAT</Text>
                        <Text style={styles.buttonDesc}>PROTOCOL: INTERVENTION REQUESTED</Text>
                    </TouchableOpacity>
                </View>    
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: '900', color: '#e63946', marginTop: 40, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: '#888', marginBottom: 30, fontWeight: '600' },
    offlineBanner: { backgroundColor: 'rgba(255, 204, 0, 0.1)', padding: 12, borderRadius: 10, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#ffcc00' },
    offlineText: { color:'#ffcc00', textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
    buttonContainer: { width: '100%', marginTop: 20, gap: 20 },
    threatButton: { width: '100%', paddingVertical: 35, borderRadius: 20, alignItems: 'center', elevation: 8 },
    armedButton: { backgroundColor: '#4a0000' },
    unarmedButton: { backgroundColor: '#e63946' },
    threatButtonIcon: { fontSize: 40, marginBottom: 10 },
    threatButtonText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
    buttonDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 'bold', marginTop: 5, letterSpacing: 1 }
});