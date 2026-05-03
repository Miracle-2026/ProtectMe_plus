import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function MapScreen() {
    const [location, setLocation] = useState(null);
    const [sosEvents, setSosEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLocationAndEvents();
    }, []);

    const getLocationAndEvents = async () => {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required for the map');
                setLoading(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            setLocation(loc.coords);

            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/sos/active`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) setSosEvents(data.active_sos_events);

        } catch (error) {
            console.error('Map error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e63946" />
            <Text style={styles.loadingText}>Loading map...</Text>
        </View>
    );
}

if (!location) {
    return (
        <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Could not get your location</Text>
        </View>
    );
} 

return (
    <View style={styles.container}>
        <MapView
        style={styles.map}
        initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        >
            {sosEvents.map(event => (
                <React.Fragment key={event.id}>
                    <Marker
                    coordinate={{
                        latitude: parseFloat(event.latitude),
                        longitude: parseFloat(event.longitude)
                    }}
                    title={event.threat_type === 'ARMED' ? '⚠️ Armed Threat' : '🆘 Unarmed Threat'}
                    description={event.address || 'Active SOS'}
                    pinColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
                    />
                    <Circle
                    center={{
                        latitude: parseFloat(event.latitude),
                        longitude: parseFloat(event.longitude)
                    }}
                    radius={500}
                    fillColor={event.threat_type === 'ARMED'
                        ? 'rgba(125,0,0,0.15)'
                        : 'rgba(230,57,70,0.15)'}
                    strokeColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
                    strokeWidth={1}
                />
                </React.Fragment>
            ))}
        </MapView>

        <View style={styles.legend}>
            <Text style={styles.legendTitle}>Active SOS Events: {sosEvents.length}</Text>
            <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#7d0000' }]} />
                <Text style={styles.legendText}>Armed - Observe Only</Text>
            </View>
            <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#e63946' }]} />
                <Text style={styles.legendText}>Unarmed - Help Needed</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: { color: '#666', marginTop: 12 },
    errorText: { color: '#e63946', fontSize: 16 },
    legend: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(10,10,10,0.9)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333'
    },
    legendTitle: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 8
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8
    },
    legendText: { color: '#ccc', fontSize: 12},
    })
};