import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';
import { addToQueue } from './offlineQueue';

let isListening = false;
let recordingInstance = null;

export const startWakeWordListener = async (onWakeWordDetected) => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Microphone permission denied');
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true
    });

    isListening = true;
    console.log('Wake word listener active');

    if (onWakeWordDetected) {
      onWakeWordDetected();
    }

    return true;
  } catch (error) {
    console.error('Wake word error:', error.message);
    return false;
  }
};

export const stopWakeWordListener = () => {
  isListening = false;
  if (recordingInstance) {
    recordingInstance.stopAndUnloadAsync();
    recordingInstance = null;
  }
  console.log('Wake word listener stopped');
};

export const triggerVoiceSOS = async (latitude, longitude) => {
  try {
    const token = await AsyncStorage.getItem('protectme_token');

    const sosPayload = {
      threat_type: 'ARMED',
      latitude: latitude || 9.0765,
      longitude: longitude || 7.3986,
      address: 'Voice-activated SOS'
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
      console.log('Voice SOS triggered successfully');
      return true;
    } else {
      await addToQueue(sosPayload);
      return false;
    }
  } catch (error) {
    console.error('Voice SOS error:', error.message);
    await addToQueue({
      threat_type: 'ARMED',
      latitude,
      longitude,
      address: 'Voice-activated SOS — queued'
    });
    return false;
  }
};