import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { addToQueue } from '../../utils/offlineQueue';
import { stopHeartbeat } from '../../utils/heartbeatSender';
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
            const { status } = await Location.requestForegroundPermissionAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required for SOS');
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
            Alert.alert('Error', 'Getting your location. Please wait.');
            return;
        }

        setLoading(true);

        const token = await AsyncStorage.getItem('protectme_token');

        const sosPayload = {
            threat_type: threatType,
            latitude: location.latitude,
            longitude: location.longitude,
            address: 'Location acquired via GPS'
        };

        if (!isConnected) {
            await addToQueue(sosPayload);
            Alert.alert(
                'SOS Queued',
                'No internet connection. Yor SOS has been saved and will be sent automatically when connection is restored.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            setLoading(false);
            return;
        }

        try{
            const reponse = await fetch(`${SERVER_URL}/api/sos/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(sosPayload)
            });

            const data = await Response.json();

           if (response.ok) {
            const { startHeartbeat } = require('../../utils/heartbeatSender');
            await startHeartbeat(data.sos.id);
            
            Alert.alert(
                'SOS Sent ✓',
                'Your alert has been sent to nearby community members and your emergency contacts. Do you want to call emergency services (112) now?',
                [
                    {
                        text:'Call 112',
                        onPress: () => callEmergencyServices()
                    },
                    {
                        text: 'No Thanks',
                        onpress: () => navigation.goBack(),
                        style: 'cancel'
                    }
                ]
            );
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            await addToQueue(sosPayload);
                Alert.alert(
                    'SOS Queued',
                    'Connection failed. Your SOS has been saved and will be sent when connection is restored.'
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
        } finally {
            setLoading(false);
        }
    };

    const callEmergencyServices = async () => {
        try {
            await Linking.openURL('tel:112');
        } catch (error) {
            console.error('Call error:', error.message);
        }
    };

    const confirmSOS = (threatType) => {
        Alert.alert(
            'Confirm SOS',
            threatType === 'ARMED'
            ? 'Send emergency alert for an armed threat?'
            : 'Send emergency alert for an unarmed threat?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SOS',
                    style: 'destructive',
                    onPress: () => triggerSOS(threatType)
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Emergency SOS</Text>
            <Text style={styles.subtitle}>Is the threat armed?</Text>

            {!isConnected && (
                <View style={styles.offlineBanner}>
                     <Text style={styles.offlineText}>
                        ⚠️ No internet - SOS will be queued locally
                    </Text>
                </View>    
            )}

            {!location && (
                <View style={styles.locationBanner}>
                    <Text style={styles.locationText}>
                        📍 Acquiring your location...
                    </Text>
                </View>    
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#e63946" style={{ marginTop: 60 }} />
            ) : (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                    style={[styles.threatButton, styles.armedButton]}
                    onPress={() => confirmSOS('ARMED')}
                    >
                        <Text style={styles.threatButtonIcon}>⚠️</Text>
                        <Text style={styles.threatButtonText}>YES - ARMED</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                    style={[styles.threatButton, styles.unarmedButton]}
                    onPress={() => confirmSOS('UNARMED')}
                    >
                        <Text style={styles.threatButtonIcon}>🆘</Text>
                        <Text style={styles.threatButtonText}>NO - UNARMED</Text>
                    </TouchableOpacity>
                </View>    
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        padding: 20,
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#e63946',
        marginTop: 20,
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: '#ffffff',
        marginBottom: 20
    },
    offlineBanner: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        width: '100%'
    },
    offlineText: {
        color:'#ffcc00',
        textAlign: 'center',
        fontSize: 13
    },
    locationBanner: {
        backgroundColor: '#1a1a1a',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        width: '100%'
    },
    locationText: {
        color: '#666',
        textAlign: 'center',
        fontSize: 13
    },
    buttonContainer: {
        width: '100%',
        marginTop: 30,
        gap: 16
    },
    threatButton: {
        width: '100%',
        padding: 30,
        borderRadius: 16,
        alignItems: 'center'
    },
    armedButton: {
        backgroundColor: '#7d0000'
    },
    unarmedButton: {
        backgroundColor: '#e63946'
    },
    threatButtonIcon: {
        fontSize: 40,
        marginBottom: 10
    },
    threatButtonText: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 'bold'
    }
});