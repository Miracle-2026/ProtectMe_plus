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
  const [riskAreas, setRiskAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRisk, setShowRisk] = useState(true);

  useEffect(() => {
    getLocationAndEvents();
  }, []);

  const getLocationAndEvents = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
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

      const [sosResponse, riskResponse] = await Promise.all([
        fetch(`${SERVER_URL}/api/sos/active`, {
          headers: { 'Authorization': 'Bearer ' + token }
        }),
        fetch(`${SERVER_URL}/api/risk`, {
          headers: { 'Authorization': 'Bearer ' + token }
        })
      ]);

      const sosData = await sosResponse.json();
      const riskData = await riskResponse.json();

      if (sosResponse.ok) setSosEvents(sosData.active_sos_events);
      if (riskResponse.ok) setRiskAreas(riskData.risk_areas);

    } catch (error) {
      console.error('Map error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'HIGH') return 'rgba(125,0,0,0.25)';
    if (level === 'MEDIUM') return 'rgba(230,100,0,0.20)';
    return 'rgba(230,57,70,0.12)';
  };

  const getRiskStroke = (level) => {
    if (level === 'HIGH') return '#7d0000';
    if (level === 'MEDIUM') return '#e66400';
    return '#e63946';
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
              title={event.threat_type === 'ARMED' ? '⚠️ Armed Threat' : '🆘 Help Needed'}
              description={event.protocol === 'OBSERVATION' ? 'DO NOT APPROACH' : 'Community help requested'}
              pinColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
            />
            <Circle
              center={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude)
              }}
              radius={300}
              fillColor={event.threat_type === 'ARMED'
                ? 'rgba(125,0,0,0.15)'
                : 'rgba(230,57,70,0.15)'}
              strokeColor={event.threat_type === 'ARMED' ? '#7d0000' : '#e63946'}
              strokeWidth={1}
            />
          </React.Fragment>
        ))}

        {showRisk && riskAreas.map((area, index) => (
          <Circle
            key={'risk-' + index}
            center={{
              latitude: area.latitude,
              longitude: area.longitude
            }}
            radius={800}
            fillColor={getRiskColor(area.risk_level)}
            strokeColor={getRiskStroke(area.risk_level)}
            strokeWidth={1}
          />
        ))}
      </MapView>

      <TouchableOpacity
        style={styles.riskToggle}
        onPress={() => setShowRisk(!showRisk)}
      >
        <Text style={styles.riskToggleText}>
          {showRisk ? '🔴 Hide Risk Zones' : '🔴 Show Risk Zones'}
        </Text>
      </TouchableOpacity>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          Active SOS: {sosEvents.length} | Risk Zones: {riskAreas.length}
        </Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#7d0000' }]} />
          <Text style={styles.legendText}>Armed — Observe Only</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#e63946' }]} />
          <Text style={styles.legendText}>Unarmed — Help Needed</Text>
        </View>
        {showRisk && (
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#e66400' }]} />
            <Text style={styles.legendText}>AI Risk Zone (7-day history)</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12 },
  errorText: { color: '#e63946', fontSize: 16 },
  riskToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(10,10,10,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e63946'
  },
  riskToggleText: { color: '#e63946', fontSize: 12, fontWeight: 'bold' },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: 'rgba(10,10,10,0.9)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  legendTitle: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { color: '#ccc', fontSize: 11 }
});