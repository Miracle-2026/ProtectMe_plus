import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from '../../utils/socketClient';
import { triggerPanicSOS } from '../../utils/panicTrigger';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { SERVER_URL } from '../../config';

export default function HomeScreen({ navigation, setIsLoggedIn }) {
    const [user, setUser] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [incomingSOS, setIncomingSOS] = useState(null);
    const [showSOSAlert, setShowSOSAlert] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            const userData = await AsyncStorage.getItem('protectme_user');
            if (!userData) return;

            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            const activeSocket = connectSocket(parsedUser.id);

            activeSocket.on('sos_alert', (alertData) => {
                setIncomingSOS(alertData);
                setShowSOSAlert(true);
            });

            activeSocket.on('geofence_breach', (data) => {
                const { latitude, longitude } = data.location;
                
                Alert.alert(
                    "🚨 GEOFENCE BREACH",
                    `${data.message}\nDistance: ${data.distance_meters}m`,
                    [
                        { 
                            text: "VIEW ON MAP", 
                            onPress: () => navigation.navigate('Map', { initialLocation: { latitude, longitude } }) 
                        },
                        {
                            text: "GET DIRECTIONS",
                            onPress: () => {
                                const label = "Ward's Location";
                                const url = Platform.select({
                                    ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
                                    android: `geo:0,0?q=${latitude},${longitude}(${label})`
                                });
                                Linking.openURL(url);
                            }
                        },
                        { text: "DISMISS", style: 'cancel' }
                    ]
                );
            });

            activeSocket.on('signal_lost', (data) => {
                Alert.alert(
                    "⚠️ SIGNAL LOST",
                    `Communication with Ward lost. Last Known Location is on the map.`,
                    [{ text: "VIEW LKL", onPress: () => navigation.navigate('Map') }]
                );
            });
        };
        initialize();
        fetchRecentActivity();
    }, []);

    const activatePanic = async () => {
        let coords = { latitude: null, longitude: null };
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                coords = loc.coords;
            }
        } catch (locationError){
            console.error('GPS failed:', locationError.message);
        }

        try {
            const success = await triggerPanicSOS(coords.latitude, coords.longitude);
            if (success) {
                Alert.alert('🚨 SOS SENT', 'Panic protocol activated.');
            } else {
                Alert.alert('🚨 SOS QUEUED', 'Alert will send when connection returns.');
            }
        } catch (error) {
            Alert.alert('🚨 SYSTEM FAILURE', 'Panic trigger failed.');
        }
    };

    const handleSOSResponse = async (action) => {
        if (!incomingSOS) return;
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ sos_event_id: incomingSOS.sosId, action })
            });
            const data = await response.json();
            if (response.ok) Alert.alert(action === 'ACCEPTED' ? 'Responding' : 'Declined', data.message);
        } catch (error) {
            Alert.alert('Error', 'Could not respond');
        } finally {
            setShowSOSAlert(false);
            setIncomingSOS(null);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/active`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) setRecentActivity(data.active_sos_events.slice(0, 3));
        } catch (error) {
            console.error('Fetch activity error:', error.message);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('protectme_token');
                    await AsyncStorage.removeItem('protectme_user');
                    setIsLoggedIn(false);
                }
            }
        ]);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>ProtectMe+</Text>
                    <Text style={styles.welcome}>Welcome, {user?.full_name?.split(' ')[0] || 'User'}</Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIcon}>
                        <Ionicons name="settings-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
                        <Ionicons name="log-out-outline" size={22} color="#e63946" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.sosContainer}>
                <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('SOS')}>
                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSubtext}>Press in emergency</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.panicButton} onLongPress={activatePanic} delayLongPress={1500}>
                    <Ionicons name="flash" size={18} color="#e63946" style={{marginRight: 8}} />
                    <Text style={styles.panicButtonText}>PANIC</Text>
                </TouchableOpacity>
                <Text style={styles.panicButtonSubtext}>Hold 1.5s - skips questions</Text>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Map')}>
                    <Ionicons name="map-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Community Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Contacts')}>
                    <Ionicons name="people-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Emergency Contacts</Text>
                </TouchableOpacity>

                {user?.role === 'guardian' ? (
                    <>
                        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Geofence')}>
                            <Ionicons name="shield-checkmark-outline" size={28} color="#e63946" style={styles.gridIcon} />
                            <Text style={styles.gridLabel}>Safe Zones</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Pairing')}>
                            <Ionicons name="link-outline" size={28} color="#e63946" style={styles.gridIcon} />
                            <Text style={styles.gridLabel}>Link Device</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={[styles.gridItem, { width: '100%' }]} onPress={() => navigation.navigate('Pairing')}>
                        <Ionicons name="link-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Device Pairing Status</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Settings')}>
                    <Ionicons name="options-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>App Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={fetchRecentActivity}>
                    <Ionicons name="refresh-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Refresh Feed</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {recentActivity.length === 0 ? (
                    <View style={styles.emptyActivity}><Text style={styles.emptyText}>No alerts nearby</Text></View>
                ) : (
                    recentActivity.map(event => (
                        <View key={event.id} style={styles.activityItem}>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityAddress} numberOfLines={1}>{event.address || 'GPS Location'}</Text>
                                <Text style={styles.activityTime}>{event.threat_type} • {new Date(event.created_at).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
    title: { fontSize: 28, fontWeight: '900', color: '#e63946' },
    welcome: { fontSize: 15, color: '#888', marginTop: 4 },
    headerIcons: { flexDirection: 'row', gap: 12 },
    headerIcon: { padding: 10, backgroundColor: '#121212', borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    sosContainer: { alignItems: 'center', marginVertical: 20 },
    sosButton: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#e63946', justifyContent: 'center', alignItems: 'center', elevation: 15 },
    sosText: { fontSize: 42, fontWeight: '900', color: '#ffffff' },
    sosSubtext: { fontSize: 13, color: '#ffcccc', marginTop: 4 },
    panicButton: { flexDirection: 'row', marginTop: 25, backgroundColor: '#121212', borderWidth: 2, borderColor: '#e63946', paddingHorizontal: 35, paddingVertical: 14, borderRadius: 30 },
    panicButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
    panicButtonSubtext: { color: '#666', fontSize: 12, marginTop: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
    gridItem: { width: '48%', backgroundColor: '#121212', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#222' },
    gridIcon: { marginBottom: 10 },
    gridLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    activitySection: { marginTop: 15, marginBottom: 50 },
    sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    emptyActivity:{ backgroundColor: '#121212', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222', borderStyle: 'dashed' },
    emptyText: { color: '#666', fontSize: 14 },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 16, padding: 16, marginBottom: 10 },
    activityInfo: { flex: 1 },
    activityAddress: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    activityTime: { color: '#888', fontSize: 12 }
});