import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { SERVER_URL } from '../../config';

export default function GeofenceScreen() {
    const [geofences, setGeofences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [radius, setRadius] = useState('200');
    const [location, setLocation] = useState(null);

    useEffect(() => {
        fetchGeofences();
        getLocation();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is needed to set a Safe Zone center.');
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

    const fetchGeofences = async () => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/geofences`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) setGeofences(data.geofences);
        } catch (error) {
            console.error('Fetch geofences error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const createGeofence = async () => {
        if (!name) {
            Alert.alert('Error', 'Zone name is required (e.g., Home or School)');
            return;
        }
        if (!location) {
            Alert.alert('Error', 'Waiting for GPS fix. Please try again in a moment.');
            getLocation();
            return;
        }
        if (parseInt(radius) < 50) {
            Alert.alert('Error', 'Radius must be at least 50 metres for reliable tracking.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/geofences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    name,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    radius_meters: parseInt(radius)
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setGeofences([data.geofence, ...geofences]);
                setName('');
                setRadius('200');
                setAdding(false);
                Alert.alert('Success', `Safe Zone "${name}" is now active.`);
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not create safe zone. Check server connection.');
        }
    };

    const deleteGeofence = async (id) => {
        Alert.alert('Delete Safe Zone', 'Wards leaving this area will no longer trigger alerts. Proceed?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('protectme_token');
                        const response = await fetch(`${SERVER_URL}/api/geofences/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (response.ok) {
                            setGeofences(geofences.filter(g => g.id !== id));
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Could not delete safe zone');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#e63946" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Safe Zones</Text>
            <Text style={styles.subtitle}>
                Define virtual radii for proactive ward monitoring (FR-04)
            </Text>

            {adding ? (
                <View style={styles.addForm}>
                    <TextInput
                        style={styles.input}
                        placeholder="Zone Name (e.g. Home, School)"
                        placeholderTextColor="#666"
                        value={name}
                        onChangeText={setName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Radius in metres (min 50)"
                        placeholderTextColor="#666"
                        value={radius}
                        onChangeText={setRadius}
                        keyboardType="number-pad"
                    />
                    <Text style={styles.locationHint}>
                        📍 Center point: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Detecting...'}
                    </Text>
                    <View style={styles.formButtons}>
                        <TouchableOpacity
                            style={[styles.formButton, styles.cancelButton]}
                            onPress={() => setAdding(false)}
                        >
                            <Text style={styles.formButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.formButton, styles.saveButton]}
                            onPress={createGeofence}
                        >
                            <Text style={styles.formButtonText}>Activate Zone</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setAdding(true)}
                >
                    <Text style={styles.addButtonText}>+ Define New Safe Zone</Text>
                </TouchableOpacity>
            )}

            {geofences.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No Active Boundaries</Text>
                    <Text style={styles.emptySubtext}>
                        Once created, you will be notified if a linked ward exits these boundaries.
                    </Text>
                </View>
            ) : (
                geofences.map(fence => (
                    <View key={fence.id} style={styles.fenceCard}>
                        <View style={styles.fenceInfo}>
                            <Text style={styles.fenceName}>{fence.name}</Text>
                            <Text style={styles.fenceRadius}>
                                📏 Boundary: {fence.radius_meters}m Radius
                            </Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: fence.is_active ? 'rgba(74, 222, 128, 0.1)' : '#222' }
                            ]}>
                                <Text style={[styles.statusText, { color: fence.is_active ? '#4ade80' : '#888' }]}>
                                    {fence.is_active ? '● MONITORING ACTIVE' : '○ DISABLED'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteGeofence(fence.id)}
                        >
                            <Text style={styles.deleteButtonText}>🗑</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20 },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: '#e63946', marginBottom: 6, marginTop: 40 },
    subtitle: { color: '#888', fontSize: 14, marginBottom: 30, fontWeight: '500' },
    addButton: {
        backgroundColor: '#121212',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e63946',
        marginBottom: 25
    },
    addButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
    addForm: {
        backgroundColor: '#121212',
        padding: 20,
        borderRadius: 16,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#222'
    },
    input: {
        backgroundColor: '#050505',
        color: '#ffffff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
        fontSize: 16
    },
    locationHint: { color: '#555', fontSize: 12, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
    formButtons: { flexDirection: 'row', gap: 10 },
    formButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
    cancelButton: { backgroundColor: '#222' },
    saveButton: { backgroundColor: '#e63946' },
    formButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
    empty: { alignItems:'center', marginTop: 80 },
    emptyText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    emptySubtext: { color: '#666', fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
    fenceCard: {
        backgroundColor: '#121212',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222'
    },
    fenceInfo: { flex: 1 },
    fenceName: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    fenceRadius: { color: '#888', fontSize: 14, marginBottom: 10, fontWeight: '500' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    deleteButton: { padding: 10, marginLeft: 10 },
    deleteButtonText: { fontSize: 24 }
});