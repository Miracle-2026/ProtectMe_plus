import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from '../../config';

export default function LoginScreen({ navigation, setIsLoggedIn }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!phone || !password) {
            Alert.alert('Error', 'Please enter your phone number and password');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${SERVER_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phone,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('protectme_token', data.token);
                await AsyncStorage.setItem('protectme_refresh_token', data.refresh_token); 
                await AsyncStorage.setItem('protectme_user', JSON.stringify(data.user));
                
                setIsLoggedIn(true);
            } else {
                Alert.alert('Login Failed', data.error || 'Invalid credentials');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not connect to server. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ProtectMe+</Text>
            <Text style={styles.subtitle}>Community Safety Network</Text>

            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#666"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Login</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.linkText}>
                    Don't have an account? Register
                </Text>
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
        padding: 20
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#e63946',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 40,
        fontWeight: '600',
        letterSpacing: 1
    },
    input: {
        width: '100%',
        backgroundColor: '#121212',
        color: '#ffffff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#222'
    },
    button: {
        width: '100%',
        backgroundColor: '#e63946', 
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#e63946',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    linkButton: {
        marginTop: 25
    },
    linkText: {
        color: '#e63946',
        fontSize: 14,
        fontWeight: '600'
    }
});