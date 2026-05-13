import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { SERVER_URL } from '../config';

const HEARTBEAT_TASK = 'SOS_HEARTBEAT_TASK';
const INTERVAL_MS = 5 * 60 * 1000;

TaskManager.defineTask(HEARTBEAT_TASK, async ({ data, error }) => {
    if (error) return;
    
    try {
        const sosEventId = await AsyncStorage.getItem('active_sos_id');
        const token = await AsyncStorage.getItem('protectme_token');
        
        if (!sosEventId || !token) return;

        const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });

        await fetch(`${SERVER_URL}/api/sos/heartbeat`, {
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
    } catch (err) {
        console.error('Background Heartbeat Fail:', err.message);
    }
});

export const startHeartbeat = async (sosEventId) => {
    try {
        await AsyncStorage.setItem('active_sos_id', sosEventId);

        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
            console.error('Background location permission denied');
            return;
        }

        await Location.startLocationUpdatesAsync(HEARTBEAT_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: INTERVAL_MS,
            distanceInterval: 10,
            foregroundService: {
                notificationTitle: "ProtectMe+ Active SOS",
                notificationBody: "Tracking location for responders...",
                notificationColor: "#e63946"
            }
        });
        
        console.log('FR-08 Heartbeat Engaged for:', sosEventId);
    } catch (error) {
        console.error('Heartbeat Start Error:', error);
    }
};

export const stopHeartbeat = async () => {
    await Location.stopLocationUpdatesAsync(HEARTBEAT_TASK);
    await AsyncStorage.removeItem('active_sos_id');
    console.log('Heartbeat Stopped');
};