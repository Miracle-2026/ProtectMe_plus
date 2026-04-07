import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-natve';
import axios from 'axios';

const SERVER_URL = 'http://10.171.35.74:5000';

export default function HomeScreen() {
    const [serverStatus, setServerStatus] = useState('Not checked yet');

    const checkServer = async () => {
        try{
            const response = await axios.get(`${SERVER_URL}/health`);
            setServerStatus(response.data.status);
        } catch (error){
            setServerStatus('Could not reach server');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ProtectMe+</Text>
            <Text style={styles.status}>Server: {serverStatus}</Text>
            <TouchableOpacity style={styles.button} onPress={checkServer}>
                <Text style={styles.buttonText}>Check Server</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#e63946',
        marginBottom: 20,
    },
    status: {
        fontSize: 16,
        color: '#ffffff',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#e63946',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});