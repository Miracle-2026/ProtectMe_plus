import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config';

const WARD_TRACKING_TASK = 'BACKGROUND_WARD_TRACKING';

TTaskManager.defineTask(WARD_TRACKING_TASK, async ({ data, error }) => {
    console.log("🚨 [TRACKER] TASK WOKE UP");
    
    if (error) {
        console.error('🚨 [TRACKER] FATAL ERROR:', error.message);
        return;
    }
    
    if (data) {
        const { locations } = data;
        const location = locations[0];
        console.log("🚨 [TRACKER] GOT GPS:", location.coords.latitude, location.coords.longitude);

        try {
            let token = await AsyncStorage.getItem('protectme_token');
            const refreshToken = await AsyncStorage.getItem('protectme_refresh_token');
            
            console.log(`🚨 [TRACKER] TOKENS -> ACCESS: ${!!token} | REFRESH: ${!!refreshToken}`);
            
            if (!token) {
                console.log("🚨 [TRACKER] ABORT: No token found in AsyncStorage.");
                return;
            }

            const sendTelemetry = async (currentToken) => {
                return await fetch(`${SERVER_URL}/api/geofences/ward/telemetry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentToken
                    },
                    body: JSON.stringify({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    })
                });
            };
            
            let response = await sendTelemetry(token);

            if (response.status === 401) {
                if (refreshToken) {
                    console.log("⚠️ [TRACKER] Access token dead. Attempting silent refresh...");
                    
                    const refreshRes = await fetch(`${SERVER_URL}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refreshToken })
                    });

                    if (refreshRes.ok) {
                        const authData = await refreshRes.json();
                        token = authData.token;
                        
                        await AsyncStorage.setItem('protectme_token', token); 
                        console.log("✅ [TRACKER] Silent refresh successful. Retrying telemetry...");
                        
                        response = await sendTelemetry(token);
                    } else {
                        console.log("❌ [TRACKER] Refresh API rejected the refresh token.");
                    }
                } else {
                    console.log("❌ [TRACKER] 401 Hit, but NO refresh token exists in memory!");
                }
            }

            console.log("🚨 [TRACKER] BACKEND RESPONDED WITH STATUS:", response.status);
            
        } catch (err) {
            console.error('🚨 [TRACKER] FETCH CRASHED:', err.message);
        }
    }
});

export const startWardTracking = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;

    await Location.startLocationUpdatesAsync(WARD_TRACKING_TASK, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 10000,
        distanceInterval: 0,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: "ProtectMe+ Safe Zone",
            notificationBody: "Location shared with your Guardian.",
            notificationColor: "#e63946"
        },
        stopOnTerminate: false, 
        startOnBoot: true, 
    });

    return true;
};