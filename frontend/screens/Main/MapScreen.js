import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Community Map</Text>
            <Text style={styles.sub}>Coming soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
    text: { color: '#e63946', fontSize: 24, fontWeight: 'bold' },
    sub: { color: '#666', marginTop: 8 }
});