import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';
import { addToQueue } from './offlineQueue';
import * as Location from 'expo-location';

export const triggerPanicSOS = async (latitude, longitude) => {
  try {
    const token = await AsyncStorage.getItem('protectme_token');

    const sosPayload = {
      threat_type: 'ARMED',
      latitude: latitude || 9.0765,
      longitude: longitude || 7.3986,
      address: 'Panic button activated'
    };

    const response = await fetch(`${SERVER_URL}/api/sos/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(sosPayload)
    });

    if (response.ok) {
      console.log('Panic SOS triggered successfully');
      return true;
    } else {
      await addToQueue(sosPayload);
      return false;
    }
  } catch (error) {
    console.error('Panic SOS error:', error.message);
    await addToQueue({
      threat_type: 'ARMED',
      latitude,
      longitude,
      address: 'Panic button activated — queued'
    });
    return false;
  }
};