import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueue, removeFromQueue } from './offlineQueue';
import { SERVER_URL } from '../config';

let isSyncing = false; 

export const syncQueuedSOS = async () => {
    if (isSyncing) return; 
    const queue = await getQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    const token = await AsyncStorage.getItem('protectme_token');
    if (!token) { isSyncing = false; return; }

    try {
        for (const item of queue) {
            const response = await fetch(`${SERVER_URL}/api/sos/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ ...item, is_synced: true })
            });
            if (response.ok) await removeFromQueue(item.id);
        }
    } catch (e) { console.error(e); } 
    finally { isSyncing = false; }
};

export const startNetworkMonitor = () => {
    return NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            syncQueuedSOS();
        }
    });
};