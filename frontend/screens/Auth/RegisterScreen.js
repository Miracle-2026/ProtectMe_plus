import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from '../../config';

export default function RegisterScreen({ navigation, setIsLoggedIn}) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [nin, setNin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !phone  || !password || !nin) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        if (nin.length !== 11) {
            Alert.alert('Error', 'NIN must be exactly 11 digits');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${SERVER_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    phone_number: phone,
                    password: password,
                    nin: nin
                })
            });

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('protectme_token', data.token);
                await AsyncStorage.setItem('protectme_refresh_token', data.refresh_token);
                await AsyncStorage.setItem('protectme_user', JSON.stringify(data.user));
                setIsLoggedIn(true);
            } else {
                Alert.alert('Registration Failed', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not connect to server. Check your connection.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>ProtectMe+</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>

            <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
            />

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

            <TextInput
            style={styles.input}
            placeholder="NIN (11 digits)"
            placeholderTextColor="#666"
            value={nin}
            onChangeText={setNin}
            keyboardType="number-pad"
            maxLength={11}
            />

            <Text style={styles.hint}>
                Your NIN is securely encrypted before storage
            </Text>

            <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
            >
                {loading
                ? <ActivityIndicator color="#fff"/>
                : <Text style={styles.buttonText}>Create Account</Text>
            }
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.linkText}>
                    Already have an account? Login
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        padding: 20
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#e63946',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 40
    },
    input: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333'
    },
    hint: {
        color: '#444',
        fontSize: 12,
        marginBottom: 20,
        textAlign: 'center'
    },
    button: {
        width: '100%',
        backgroundColor: '#e63946',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    linkButton: {
        marginTop: 20
    },
    linkText: {
        color: '#e63946',
        fontSize: 14
    }
});