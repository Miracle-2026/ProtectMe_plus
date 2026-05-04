import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { SERVER_URL } from '../config';

let heartbeatInterval = null;
const INTERVAL_MS = 5 * 60 * 1000;

export const startHeartbeat = async (sosEventId) => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  console.log('Heartbeat started for SOS:', sosEventId);

  const sendHeartbeat = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const token = await AsyncStorage.getItem('protectme_token');

      const response = await fetch(`${SERVER_URL}/api/sos/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          sos_event_id: sosEventId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        })
      });

      if (response.ok) {
        console.log('Heartbeat sent at', new Date().toISOString());
      }
    } catch (error) {
      console.error('Heartbeat error:', error.message);
    }
  };

  await sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, INTERVAL_MS);
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('Heartbeat stopped');
  }
};