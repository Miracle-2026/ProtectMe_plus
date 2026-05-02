import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'protectme_sos_queue';

export const addToQueue = async (sosPayload) => {
    try {
        const existing = await getQueue();
        const updated = [...existing, {
            ...sosPayload,
            queued_at: new Date().toISOString(),
            id: Date.now().toString()
        }];
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
        console.log('SOS queued locally:', updated.length, 'items in queue');
        return true;
    } catch (error) {
        console.error('Queue error:', error.message);
        return false;
    }
};

export const getQueue = async () => {
    try {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Get queue error:', error.message);
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
        console.error('Remove from queue error:', error.message);
        return false;
    }
};

export const clearQueue = async () => {
    try {
        await AsyncStorage.removeItem(QUEUE_KEY);
        return true;
    } catch (error) {
        console.error('Clear queue error:', error.message);
        return false;
    }
};