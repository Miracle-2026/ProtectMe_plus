import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, getSocket } from '../../utils/socketClient';
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
        loadUser();
        fetchRecentActivity();
        
        let activeSocket = null;
        
        const initializeSocket = async () =>{
            const userData = await AsyncStorage.getItem('protectme_user');
            if (!userData) return;

            const parsedUser = JSON.parse(userData);
            activeSocket = connectSocket(parsedUser.id);

            activeSocket.off('sos_alert');
            activeSocket.off('responder_accepted');
            activeSocket.off('geofence_breach');


            activeSocket.on('sos_alert', (alertData) => {
                setIncomingSOS(alertData);
                setShowSOSAlert(true);
            });

            activeSocket.on('responder_accepted', (data) => {
                Alert.alert('Responder On The Way', data.message, [{ text: 'OK' }]);
            });

            activeSocket.on('geofence_breach', (data) => {
                console.log("🚨 INCOMING BREACH ALERT:", data);
                Alert.alert(
                    "🚨 GEOFENCE BREACH 🚨",
                    `${data.message}\nDistance: ${data.distance_meters} meters`,
                    [{ text: "ACKNOWLEDGE", style: "destructive" }]
                );
            });
        };

        initializeSocket();

        return () => {
            if (activeSocket) {
                activeSocket.off('sos_alert');
                activeSocket.off('responder_accepted');
                activeSocket.off('geofence_breach');
            }
        };
    }, []);
    
    const activatePanic = async () => {
        let coords = { latitude: null, longitude: null };
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High
                });
                coords = loc.coords;
            } else {
                console.warn("Location permission denied by user.");
            }
        } catch (locationError){
            console.error('GPS acquisition failed:', locationError.message);
        } 
        
        try {
            const success = await triggerPanicSOS(coords.latitude, coords.longitude);

            if (success) {
                Alert.alert(
                    '🚨 SOS SENT',
                    coords.latitude
                    ? 'Emergency alert sent with exact location. ARMED/OBSERVATION protocol activated.'
                    : 'Emergency alert sent WITHOUT location data. Responders notified.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    '🚨 SOS QUEUED',
                    'No connection. SOS saved locally and will send when connection returns.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert('🚨 SYSTEM FAILURE', 'Panic trigger failed to execute.');
            console.error('Panic trigger execution error:', error.message);
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
                body: JSON.stringify({
                    sos_event_id: incomingSOS.sosId,
                    action
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Alert.alert(
                    action === 'ACCEPTED' ? 'Responding' : 'Declined',
                    data.message
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Could not respond to SOS');
        } finally {
            setShowSOSAlert(false);
            setIncomingSOS(null);
        }
    };

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('protectme_user');
            if (userData) setUser(JSON.parse(userData));
        } catch (error) {
            console.error('Load user error:', error.message);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/active`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) {
                setRecentActivity(data.active_sos_events.slice(0, 3));
            }
        } catch (error) {
            console.error('Fetch activity error:', error.message);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
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
            ]
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>ProtectMe+</Text>
                    <Text style={styles.welcome}>
                        Welcome, {user && user.full_name ? user.full_name.split(' ')[0] : 'User'}
                    </Text>
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
                <TouchableOpacity
                    style={styles.sosButton}
                    onPress={() => navigation.navigate('SOS')}
                >
                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSubtext}>Press in emergency</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.panicButton}
                    onLongPress={activatePanic}
                    delayLongPress={1500}
                    activeOpacity={0.7}
                >
                    <Ionicons name="flash" size={18} color="#e63946" style={{marginRight: 8}} />
                    <Text style={styles.panicButtonText}>PANIC</Text>
                </TouchableOpacity>
                <Text style={styles.panicButtonSubtext}>Hold 1.5s - skips questions</Text>
            </View>

            {/* UPGRADED 6-ITEM GRID */}
            <View style={styles.grid}>
                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Map')}>
                    <Ionicons name="map-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Community Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Contacts')}>
                    <Ionicons name="people-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Emergency Contacts</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Geofence')}>
                    <Ionicons name="shield-checkmark-outline" size={28} color="#e63946" style={styles.gridIcon} />
                    <Text style={styles.gridLabel}>Safe Zones</Text>
                </TouchableOpacity>

                {/* NEW PAIRING BUTTON */}
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
                            <View style={[
                                styles.activityBadge,
                                { backgroundColor: event.threat_type === 'ARMED' ? 'rgba(230, 57, 70, 0.2)' : 'rgba(230, 57, 70, 0.1)' }
                            ]}>
                                <Text style={[
                                    styles.activityBadgeText, 
                                    { color: event.threat_type === 'ARMED' ? '#ff4d4d' : '#e63946' }
                                ]}>{event.threat_type}</Text>
                            </View>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityAddress} numberOfLines={1}>
                                    {event.address || 'Location acquired via GPS'}
                                </Text>
                                <Text style={styles.activityTime}>
                                    {new Date(event.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </Text>
                            </View>
                            <View style={[
                                styles.activityProtocol,
                                { backgroundColor: event.protocol === 'OBSERVATION' ? 'rgba(125, 0, 0, 0.2)' : 'rgba(26, 92, 26, 0.2)' }
                            ]}>
                                <Text style={[
                                    styles.activityProtocolText,
                                    { color: event.protocol === 'OBSERVATION' ? '#ff4d4d' : '#4ade80'}
                                ]}>
                                    {event.protocol ==='OBSERVATION' ? 'OBSERVE' : 'HELP'}
                                </Text>
                            </View>
                        </View> 
                    ))    
                )}
            </View>
            
            {showSOSAlert && incomingSOS && (
                <View style={styles.sosAlertOverlay}>
                    <View style={styles.sosAlertCard}>
                        <View style={styles.alertIconContainer}>
                            <Ionicons name="warning" size={40} color={incomingSOS.threat_type === 'ARMED' ? '#ff4d4d' : '#e63946'} />
                        </View>
                        <Text style={styles.sosAlertTitle}>
                            {incomingSOS.threat_type === 'ARMED' ? 'ARMED THREAT NEARBY' : 'HELP NEEDED NEARBY'}
                        </Text>
                        <View style={[
                            styles.sosAlertProtocol,
                            { backgroundColor: incomingSOS.threat_type === 'ARMED' ? '#7d0000' : '#e63946' }
                            ]}>
                            <Text style={styles.sosAlertProtocolText}>
                                {incomingSOS.protocol_instruction}
                            </Text>
                        </View>
                        <Text style={styles.sosAlertAddress}>
                            {incomingSOS.address || 'Nearby location'}
                        </Text>
                        <View style={styles.sosAlertButtons}>
                            <TouchableOpacity
                                style={[styles.sosAlertButton, styles.declineButton]}
                                onPress={() => handleSOSResponse('DECLINED')}
                            >
                                <Text style={styles.sosAlertButtonText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sosAlertButton, styles.acceptButton]}
                                onPress={() => handleSOSResponse('ACCEPTED')}
                            >
                                <Text style={styles.sosAlertButtonText}>
                                    {incomingSOS.threat_type === 'ARMED' ? 'Observe' : 'Respond'}
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    sosButton: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#e63946', justifyContent: 'center', alignItems: 'center', elevation: 15, shadowColor: '#e63946', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, borderWidth: 4, borderColor: 'rgba(230, 57, 70, 0.3)' },
    sosText: { fontSize: 42, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
    sosSubtext: { fontSize: 13, color: '#ffcccc', marginTop: 4, fontWeight: '600' },
    panicButton: { flexDirection: 'row', marginTop: 25, backgroundColor: '#121212', borderWidth: 2, borderColor: '#e63946', paddingHorizontal: 35, paddingVertical: 14, borderRadius: 30, alignItems: 'center' },
    panicButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    panicButtonSubtext: { color: '#666', fontSize: 12, marginTop: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
    gridItem: { width: '48%', backgroundColor: '#121212', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#222', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
    gridIcon: { marginBottom: 10 },
    gridLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
    activitySection: { marginTop: 15, marginBottom: 50 },
    sectionTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: 0.5 },
    emptyActivity:{ backgroundColor: '#121212', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222', borderStyle: 'dashed' },
    emptyText: { color: '#666', fontSize: 14, fontWeight: '500' },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
    activityBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
    activityBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    activityInfo: { flex: 1 },
    activityAddress: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    activityTime: { color: '#888', fontSize: 12 },
    activityProtocol: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 10 },
    activityProtocolText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    sosAlertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 999 },
    sosAlertCard: { backgroundColor: '#121212', borderRadius: 24, padding: 24, width: '100%', borderWidth: 2, borderColor: '#e63946', alignItems: 'center', shadowColor: '#e63946', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 20 },
    alertIconContainer: { marginBottom: 16, backgroundColor: 'rgba(230, 57, 70, 0.1)', padding: 16, borderRadius: 50 },
    sosAlertTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 1 },
    sosAlertProtocol: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 16, width: '100%' },
    sosAlertProtocolText: { color: '#ffffff', fontSize: 15, textAlign: 'center', fontWeight: 'bold', letterSpacing: 0.5 },
    sosAlertAddress: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    sosAlertButtons: { flexDirection: 'row', gap: 12, width: '100%' },
    sosAlertButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    declineButton: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    acceptButton: { backgroundColor: '#e63946' },
    sosAlertButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }
});