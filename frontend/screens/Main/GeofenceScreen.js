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
    const [wardId, setWardId] = useState('');
    const [location, setLocation] = useState(null);

    useEffect(() => {
        fetchGeofences();
        getLocation();
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
        } catch (error) {
            console.error('Location erro:', error.message);
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
        if (!name || !wardId) {
            Alert.alert('Error', 'Zone name and Ward ID are required');
            return;
        }
        if (!location) {
            Alert.alert('Error', 'Could not get your location');
            return;
        }
        if (parseInt(radius) < 50) {
            Alert.alert('Error', 'Radius must be at least 50 metres');
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
                    ward_id: wardId,
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
                setWardId('');
                setRadius('200');
                setAdding(false);
                Alert.alert('Success', 'Safe zone created successfully');
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not create safe zone');
        }
    };

    const deleteGeofence = async (id) => {
        Alert.alert('Delete Safe Zone', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('protectme_token');
                        const reponse = await fetch(`${SERVER_URL}/api/geofences/${id}`, {
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
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Safe Zones</Text>
            <Text style={styles.subtitle}>
                Create virtual boundaries for your wards
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
                    placeholder="Ward's User ID"
                    placeholderTextColor="#666"
                    value={wardId}
                    onChangeText={setWardID}
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
                        📍 Zone center will be set to your current location
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
                            <Text style={styles.formButtonText}>Create Zone</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAdding(true)}
                >
                    <Text style={styles.addbuttonText}>+ Create Safe Zone</Text>
                </TouchableOpacity>
            )}

            {geofences.length === 0 ? (
                <View style= {styles.empty}>
                    <Text style={styles.emptyText}>No safe zones yet</Text>
                    <Text style={styles.emptySubtext}>
                        Create a safe zone to monitor a ward's location
                    </Text>
                </View>
            ) : (
                geofences.map(fence => (
                    <View key={fence.id} style={styles.fenceCard}>
                        <View style={styles.fenceInfo}>
                            <Text style={styles.fenceName}>{fence.name}</Text>
                            <Text style={styles.fenceRadius}>
                                Radius: {fence.radius_meters}m
                            </Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: fence.is_active ? '#1a5c1a' : '#333' }
                            ]}>
                                <Text style={styles.statusText}>
                                    {fence.is_active ? '● Active' : '○ Inactive'}
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
    container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
    loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#e63946', marginBottom: 6, marginTop: 10},
    subtitle: { color: '#666', fontSize: 13, marginBottom: 20 },
    addButton: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e63946',
        marginBottom: 20
    },
    addButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
    addForm: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    input: {
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 15
    },
    locationHunt: { color: '#666', fontSize: 12, marginBottom: 12, textAlign: 'center', },
    formButtons: { flexDirection: 'row', gap: 10 },
    formbutton: { flex: 1, padding: 12, borderRadius: 8, alignitems: 'center' },
    cancelButton: { backgroundColor: '#333' },
    saveButton: { backgroundColor: '#e63946' },
    formButtonText: { color: '#ffffff', fontWeight: 'bold' },
    empty: { alignItems:'center', marginTop: 60 },
    emptyText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    emptySubtext: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
    fenceCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    fenceInfo: { flex: 1 },
    fenceName: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    fenceRadius: { color: '#aaa', fontSize: 13, marginBottom: 6 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { color: '#ffffff', fontSize: 11 },
    deleteButton: { padding: 8 },
    deleteButtonText: { fontSize: 20 }
});