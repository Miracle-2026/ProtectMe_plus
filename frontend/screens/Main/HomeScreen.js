import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
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

            activeSocket.on('signal_lost', (data) => {
                Alert.alert(
                    "🚨 CRITICAL: SIGNAL LOST",
                    "Communication with Ward device lost. Viewing Last Known Location (LKL) is recommended.",
                    [{ text: "VIEW ON MAP", onPress: () => navigation.navigate('Map') }]
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
        } catch (err) { console.error('GPS failed:', err.message); } 
        
        const success = await triggerPanicSOS(coords.latitude, coords.longitude);
        Alert.alert(success ? '🚨 SOS SENT' : '🚨 SOS QUEUED', success ? 'Alert dispatched.' : 'Saved locally.');
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('protectme_token');
        await AsyncStorage.removeItem('protectme_user');
        setIsLoggedIn(false);
    };

    const fetchRecentActivity = async () => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/active`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) setRecentActivity(data.active_sos_events.slice(0, 3));
        } catch (err) { console.error('Activity error:', err.message); }
    };

    const handleSOSResponse = async (action) => {
        if (!incomingSOS) return;
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sos_event_id: incomingSOS.sosId, action })
            });
            const data = await response.json();
            if (response.ok) Alert.alert(action === 'ACCEPTED' ? 'Responding' : 'Declined', data.message);
        } catch (error) { Alert.alert('Error', 'Could not respond to SOS'); } 
        finally { setShowSOSAlert(false); setIncomingSOS(null); }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>ProtectMe+</Text>
                    {}
                    <Text style={styles.welcome}>Logged in as: {user?.role?.toUpperCase() || 'USER'}</Text>
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

            {}
            {user?.role === 'ward' ? (
                <View style={styles.sosContainer}>
                    <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('SOS')}>
                        <Text style={styles.sosText}>SOS</Text>
                        <Text style={styles.sosSubtext}>Press in emergency</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.panicButton} onLongPress={activatePanic} delayLongPress={1500} activeOpacity={0.7}>
                        <Ionicons name="flash" size={18} color="#e63946" style={{marginRight: 8}} />
                        <Text style={styles.panicButtonText}>PANIC</Text>
                    </TouchableOpacity>
                    <Text style={styles.panicButtonSubtext}>Hold 1.5s - skips questions</Text>
                </View>
            ) : (
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Map')}>
                        <Ionicons name="map-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Monitor Wards (LKL)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Contacts')}>
                        <Ionicons name="people-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Emergency Contacts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Geofence')}>
                        <Ionicons name="shield-checkmark-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Safe Zones</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Pairing')}>
                        <Ionicons name="link-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Link Device</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Settings')}>
                        <Ionicons name="options-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Settings</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.gridItem} onPress={fetchRecentActivity}>
                        <Ionicons name="refresh-outline" size={28} color="#e63946" style={styles.gridIcon} />
                        <Text style={styles.gridLabel}>Refresh Activity</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {recentActivity.length === 0 ? (
                    <View style={styles.emptyActivity}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#666" style={{marginBottom: 8}} />
                        <Text style={styles.emptyText}>No active SOS events nearby</Text>
                    </View>
                ) : (
                    recentActivity.map(event => (
                        <View key={event.id} style={styles.activityItem}>
                             <Text style={{color: '#fff', fontWeight: 'bold'}}>{event.threat_type} - {event.protocol}</Text>
                        </View> 
                    ))    
                )}
            </View>
            
            {showSOSAlert && incomingSOS && (
                <View style={styles.sosAlertOverlay}>
                    <View style={styles.sosAlertCard}>
                        <Ionicons name="warning" size={40} color={incomingSOS.threat_type === 'ARMED' ? '#ff4d4d' : '#e63946'} />
                        <Text style={styles.sosAlertTitle}>
                            {incomingSOS.threat_type === 'ARMED' ? 'ARMED THREAT NEARBY' : 'HELP NEEDED NEARBY'}
                        </Text>
                        <TouchableOpacity style={[styles.sosAlertButton, styles.acceptButton]} onPress={() => handleSOSResponse('ACCEPTED')}>
                            <Text style={styles.sosAlertButtonText}>Respond</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.sosAlertButton, styles.declineButton]} onPress={() => handleSOSResponse('DECLINED')}>
                            <Text style={styles.sosAlertButtonText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
    title: { fontSize: 28, fontWeight: '900', color: '#e63946', letterSpacing: 0.5 },
    welcome: { fontSize: 15, color: '#888', marginTop: 4, fontWeight: '500' },
    headerIcons: { flexDirection: 'row', gap: 12 },
    headerIcon: { padding: 10, backgroundColor: '#121212', borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    sosContainer: { alignItems: 'center', marginVertical: 20 },
    sosButton: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#e63946', justifyContent: 'center', alignItems: 'center', elevation: 15 },
    sosText: { fontSize: 42, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
    sosSubtext: { fontSize: 13, color: '#ffcccc', marginTop: 4, fontWeight: '600' },
    panicButton: { flexDirection: 'row', marginTop: 25, backgroundColor: '#121212', borderWidth: 2, borderColor: '#e63946', paddingHorizontal: 35, paddingVertical: 14, borderRadius: 30, alignItems: 'center' },
    panicButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    panicButtonSubtext: { color: '#666', fontSize: 12, marginTop: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
    gridItem: { width: '48%', backgroundColor: '#121212', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#222' },
    gridIcon: { marginBottom: 10 },
    gridLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    activitySection: { marginTop: 15, marginBottom: 50 },
    sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    emptyActivity:{ backgroundColor: '#121212', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222', borderStyle: 'dashed' },
    emptyText: { color: '#666', fontSize: 14, fontWeight: '500' },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
    sosAlertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    sosAlertCard: { backgroundColor: '#121212', borderRadius: 24, padding: 24, width: '90%', borderWidth: 2, borderColor: '#e63946', alignItems: 'center' },
    sosAlertTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginVertical: 20 },
    sosAlertButton: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 5 },
    acceptButton: { backgroundColor: '#e63946' },
    declineButton: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    sosAlertButtonText: { color: '#ffffff', fontWeight: 'bold' }
});