import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation, setIsLoggedIn }) {
    const [user, setUser] = useState('null');

    useEffect(() => {
        loadUser();
    }, []);
    
    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('protectme_user');
            if (userData) setUser(JSON.parse(userData));
        } catch (error) {
            console.error('Load user error:', error.message);
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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>ProtectMe+</Text>
                <Text style={styles.welcome}>
                    Welcome, {user ? user.full_name.split(' ')[0] : 'User'}
                </Text>
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
                onPress={handleLogout}
                >
                    <Text style={styles.gridIcon}>🚪</Text>
                    <Text style={styles.gridLabel}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgrounColor: '#0a0a0a',
        padding: 20
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
        shadowOffset: {width: 0, height: 0},
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
    }
});