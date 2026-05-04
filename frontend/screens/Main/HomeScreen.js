import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function HomeScreen({ navigation, setIsLoggedIn }) {
    const [user, setUser] = useState('null');
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        loadUser();
        fetchRecentActivity();
    }, []);
    
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
        <ScrollView style={styles.container}>
            <View style={styles.header}>
             <View>
                <Text style={styles.title}>ProtectMe+</Text>
                <Text style={styles.welcome}>
                    Welcome, {user && user.full_name ? user.full_name.split(' ')[0] : 'User'}
                </Text>
             </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
                <Text style={styles.logoutText}>⏻</Text>
            </TouchableOpacity>
            </View>

            <View style={styles.sosContainer}>
                <TouchableOpacity
                style={styles.sosButton}
                onPress={() => navigation.navigate('SOS')}
                >

                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubtext}>Press in emergency</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Map')}
                >
                    <Text style={styles.gridIcon}>🗺️</Text>
                    <Text style={styles.gridLabel}>Community Map</Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Contacts')}
                >
                    <Text style={styles.gridIcon}>👥</Text>
                    <Text style={styles.gridLabel}>Emergency Contacts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Geofence')}
                >
                    <Text style={styles.gridIcon}>📍</Text>
                    <Text style={styles.gridLabel}>Safe Zones</Text>
                </TouchableOpacity>

                <TouchableOpacity
  style={styles.gridItem}
  onPress={() => navigation.navigate('Settings')}
>
  <Text style={styles.gridIcon}>⚙️</Text>
  <Text style={styles.gridLabel}>Settings</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.gridItem}
  onPress={fetchRecentActivity}
>
  <Text style={styles.gridIcon}>🔄</Text>
  <Text style={styles.gridLabel}>Refresh Activity</Text>
</TouchableOpacity>
            </View>

            <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {recentActivity.length === 0 ? (
                    <View style={styles.emptyActivity}>
                        <Text style={styles.emptyText}>No active SOS events nearby</Text>
                    </View>
                ) : (
                    recentActivity.map(event => (
                        <View key={event.id} style={styles.activityItem}>
                            <View style={[
                                styles.activityBadge,
                                { backgroundColor: event.threat_type === 'ARMED' ? '#7d0000' : '#e63946' }
                            ]}>
                                <Text style={styles.activityBadgeText}>{event.threat_type}</Text>
                            </View>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityAddress} numberOfLines={1}>
                                    {event.address || 'Location acquired via GPS'}
                                </Text>
                                <Text style={styles.activityTime}>
                                    {new Date(event.created_at).toLocaleTimeString()}
                                </Text>
                            </View>
                            <View style={[
                                styles.activityProtocol,
                                { backgroundColor: event.protocol === 'OBSERVATION' ? '#7d0000' : '#1a5c1a' }
                            ]}>
                                <Text style={styles.activityProtocolText}>
                                    {event.protocol ==='OBSERVATION' ? '👁 OBSERVE' : '🤝 HELP'}
                                </Text>
                            </View>
                           </View> 
                    ))    
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgrounColor: '#0a0a0a',
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 30
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#e63946'
    },
    welcome: {
        fontSize: 16,
        color: '#666',
        marginTop: 4
    },
    logoutIcon: {
        padding: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333'
    },
    logoutText: {
        fontSize: 20,
        color: '#e63946'
    },
    sosContainer: {
        alignItems: 'center',
        marginVertical: 30
    },
    sosButton: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgrounColor: '#e63946',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#e63946',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20
    },
    sosText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    sosSubtext: {
        fontSize: 12,
        color: '#ffcccc',
        marginTop: 4
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 20
    },
    gridItem: {
        width: '48%',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333'
    },
    gridIcon: {
        fontSize: 32,
        marginBottom: 8
    },
    gridLabel: {
        color: '#ffffff',
        fontSize: 13,
        textAlign: 'center'
    },
    activitySection: {
        marginTop: 10,
        marginBottom: 40
    },
    sectionTitle: {
        color: '#ffffff',
        fonSize: 18,
        fontWeight: 'bold',
        marginBottom: 12
    },
    emptyActivity:{
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    emptyText: {
        color: '#666',
        fontSize: 14
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#333'
    },
    activityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10
    },
    activityBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    activityInfo: {
        flex: 1
    },
    activityAddress: {
        color: '#ffffff',
        fontSize: 13
    },
    activityTime: {
        color: '#666',
        fontSize: 11,
        marginTop: 2
    },
    activityProtocol: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8
    },
    activityProtocolText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});