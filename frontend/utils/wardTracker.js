import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';

const WARD_TRACKING_TASK = 'BACKGROUND_WARD_TRACKING';

export const setTrackingMode = async (isEmergency) => {
    const interval = isEmergency ? 10000 : 300000; 
    await Location.startLocationUpdatesAsync(WARD_TRACKING_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: interval,
        distanceInterval: isEmergency ? 0 : 20,
        startOnBoot: true,
        stopOnTerminate: false,
        foregroundService: {
            notificationTitle: "ProtectMe+ Active",
            notificationBody: isEmergency ? "High-priority tracking active." : "Guardian monitoring active.",
            notificationColor: "#e63946"
        }
    });
};

TaskManager.defineTask(WARD_TRACKING_TASK, async ({ data, error }) => {
    if (error) {
        console.error('🚨 [TRACKER] TASK ERROR:', error.message);
        return;
    }
    
    if (data) {
        const { locations } = data;
        const { latitude, longitude } = locations[0].coords;

        try {
            let token = await AsyncStorage.getItem('protectme_token');
            const refreshToken = await AsyncStorage.getItem('protectme_refresh_token');
 
            const sendTelemetry = async (currentToken) => {
                return await fetch(`${SERVER_URL}/api/geofences/ward/telemetry`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${currentToken}` 
                    },
                    body: JSON.stringify({ latitude, longitude })
                });
            };

            let response = await sendTelemetry(token);

            if (response.status === 401 && refreshToken) {
                console.log("⚠️ [TRACKER] Token expired. Attempting silent refresh...");
                
                const refreshRes = await fetch(`${SERVER_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshRes.ok) {
                    const authData = await refreshRes.json();
                    const newToken = authData.token;
                    
                    await AsyncStorage.setItem('protectme_token', newToken); 
                    console.log("✅ [TRACKER] Refresh successful. Retrying telemetry...");
                    
                    await sendTelemetry(newToken);
                }
            }
        } catch (err) {
            console.error('🚨 [TRACKER] Background sync failed:', err.message);
        }
    }
});

export const startWardTracking = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;

    await setTrackingMode(true);
    return true;
};