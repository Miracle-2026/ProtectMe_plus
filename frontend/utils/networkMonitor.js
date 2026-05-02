import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueue, removeFromQueue } from './offlineQueue';

import { SERVER_URL } from '../config';

export const syncQueuedSOS = async () => {
    const queue = await getQueue();

    if (queue.length === 0) return;

    console.log('Syncing', queue.length, 'queued SOS events...');

    const token = await AsyncStorage.getItem('protectme_token');

    if (!token) {
        console.log('No auth token found, cannot sync');
        return;
    }

    for (const item of queue) {
        try {
            const response = await fetch(`${SERVER_URL}/api/sos/trigger`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    threat_type: item.threat_type,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    address: item.address
                })
            });

            if (response.ok) {
                await removeFromQueue(item.id);
                console.log('Queued SOS synced successfully:', item.id);
            }
        } catch (error) {
            console.log('Sync error for item', item.id, ':', error.message);
        }
    }
};

export const startNetworkMonitor = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            console.log('Network restored - attempting queue sync');
            syncQueuedSOS();
        }
    });

    return unsubscribe;
};