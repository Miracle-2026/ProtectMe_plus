import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity
} from 'react-native';
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for the community map');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(loc.coords);

      const token = await AsyncStorage.getItem('protectme_token');

      const response = await fetch(`${SERVER_URL}/api/sos/active?user_lat=${loc.coords.latitude}&user_lon=${loc.coords.longitude}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      const data = await response.json();
      if (response.ok) {
        setSosEvents(data.active_sos_events);
      }

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
        <Text style={styles.loadingText}>Connecting to safety network...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 9.0579,
          longitude: location?.longitude || 7.4951,
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
              title={event.threat_type === 'ARMED' ? '⚠️ ARMED THREAT' : '🆘 ASSISTANCE NEEDED'}
              description={event.protocol === 'OBSERVATION' ? 'OBSERVE ONLY - DO NOT APPROACH' : 'Intervention requested'}
              pinColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
            />
            <Circle
              center={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude)
              }}
              radius={300}
              fillColor={event.threat_type === 'ARMED'
                ? 'rgba(125,0,0,0.2)'
                : 'rgba(230,57,70,0.2)'}
              strokeColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
      </MapView>

      {}
      <TouchableOpacity style={styles.refreshButton} onPress={getLocationAndEvents}>
        <Text style={styles.refreshText}>🔄 REFRESH ALERTS</Text>
      </TouchableOpacity>

      {}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>COMMUNITY EMERGENCY FEED</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#7d0000' }]} />
          <Text style={styles.legendText}>ARMED: Observation Protocol Only</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#e63946' }]} />
          <Text style={styles.legendText}>UNARMED: Assistance Requested</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontWeight: 'bold' },
  refreshButton: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 5
  },
  refreshText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(10,10,10,0.95)',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333'
  },
  legendTitle: { color: '#e63946', fontSize: 13, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendText: { color: '#ccc', fontSize: 11, fontWeight: '600' }
});