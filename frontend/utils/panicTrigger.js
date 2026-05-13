import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';
import { addToQueue } from './offlineQueue';
import * as Location from 'expo-location';

export const triggerPanicSOS = async (latitude, longitude) => {
  let finalLat = latitude;
  let finalLon = longitude;

  try {
    const token = await AsyncStorage.getItem('protectme_token');

    if (!finalLat || !finalLon) {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      finalLat = loc.coords.latitude;
      finalLon = loc.coords.longitude;
    }

    const sosPayload = {
      threat_type: 'ARMED',
      latitude: finalLat,
      longitude: finalLon,
      address: 'Panic trigger: User cannot interact with screen'
    };

    const response = await fetch(`${SERVER_URL}/api/sos/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(sosPayload)
    });

    const data = await response.json();

    if (response.ok) {
      const { startHeartbeat } = require('./heartbeatSender');
      await startHeartbeat(data.sos.id);
      return true;
    } else {
      await addToQueue(sosPayload);
      return false;
    }
  } catch (error) {
    console.error('[PANIC ERROR]', error.message);
    await addToQueue({
      threat_type: 'ARMED',
      latitude: finalLat || 9.0765,
      longitude: finalLon || 7.3986,
      address: 'Panic button activated — offline queue'
    });
    return false;
  }
};