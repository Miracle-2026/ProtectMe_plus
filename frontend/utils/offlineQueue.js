import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'protectme_sos_queue';

export const addToQueue = async (sosPayload) => {
    try {
        const existing = await getQueue();
        
        const newItem = {
            ...sosPayload,
            id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            queued_at: new Date().toISOString(),
            retry_count: 0
        };

        const updated = [...existing, newItem];
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
        
        console.log(`[QUEUE] SOS cached locally. Total items: ${updated.length}`);
        return true;
    } catch (error) {
        console.error('[QUEUE ERROR] Failed to cache SOS:', error.message);
        return false;
    }
};

export const getQueue = async () => {
    try {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[QUEUE ERROR] Retrieval failed:', error.message);
        return [];
    }
};

export const removeFromQueue = async (id) => {
    try {
        const existing = await getQueue();
        const updated = existing.filter(item => item.id !== id);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
        return true;
    } catch (error) {
        console.error('[QUEUE ERROR] Cleanup failed:', error.message);
        return false;
    }
};

export const clearQueue = async () => {
    try {
        await AsyncStorage.removeItem(QUEUE_KEY);
        return true;
    } catch (error) {
        return false;
    }
};