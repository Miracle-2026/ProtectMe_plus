import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';

const WARD_TRACKING_TASK = 'BACKGROUND_WARD_TRACKING';
 
TaskManager.defineTask(WARD_TRACKING_TASK, async ({ data, error }) => {
    if (error) {
        console.error('🚨 [TRACKER] TASK ERROR:', error.message);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];

        try {
            let token = await AsyncStorage.getItem('protectme_token');
            const refreshToken = await AsyncStorage.getItem('protectme_refresh_token');

            if (!token) return;

            const sendTelemetry = async (currentToken) => {
                return await fetch(`${SERVER_URL}/api/geofences/ward/telemetry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentToken
                    },
                    body: JSON.stringify({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        timestamp: location.timestamp
                    })
                });
            };

            let response = await sendTelemetry(token);

            if (response.status === 401 && refreshToken) {
                const refreshRes = await fetch(`${SERVER_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshRes.ok) {
                    const authData = await refreshRes.json();
                    token = authData.token;
                    await AsyncStorage.setItem('protectme_token', token);
                    await sendTelemetry(token);
                }
            }
        } catch (err) {
            console.error('🚨 [TRACKER] SYNC FAILED:', err.message);
        }
    }
});

export const startWardTracking = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;

    await Location.startLocationUpdatesAsync(WARD_TRACKING_TASK, {
        accuracy: Location.Accuracy.Balanced, 
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: "ProtectMe+ Active Protection",
            notificationBody: "Your location is being shared with your Guardian.",
            notificationColor: "#e63946"
        },
        stopOnTerminate: false,
        startOnBoot: true,
    });

    return true;
};