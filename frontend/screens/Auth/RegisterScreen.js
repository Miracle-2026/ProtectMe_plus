import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

import { SERVER_URL } from '../../config';

export default function RegisterScreen({ navigation, setIsLoggedIn }) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [nin, setNin] = useState('');
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState('guardian');

    const handleRegister = async () => {
        if (!fullName || !phone || !password || !nin) {
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
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>ProtectMe+</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>
            <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>I am a:</Text>
                <Picker
                selectedValue={role}
                onValueChange={(itemValue) => setRole(itemValue)}
                style={styles.picker}
                dropdownIconColor="#e63946"
                >
                    <Picker.Item label="Guardian (Protects Wards)" value="guardian" />
                    <Picker.Item label="Ward (Requires Protection)" value="ward" />
                </Picker>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#666"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
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
                🛡️ Your NIN is encrypted with AES-256 before storage
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
    pickerContainer: {
        width: '100%',
        backgroundColor: '#121212',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
        paddingHorizontal: 10,
    },
    pickerLabel: {
        color: '#666',
        fontSize: 12,
        marginTop: 10,
        marginLeft: 5
    },
    picker: {
        color: '#ffffff',
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050505',
        padding: 20,
        paddingTop: 60
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#e63946',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
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
    hint: {
        color: '#555',
        fontSize: 12,
        marginBottom: 25,
        textAlign: 'center',
        paddingHorizontal: 10,
        fontWeight: '500'
    },
    button: {
        width: '100%',
        backgroundColor: '#e63946',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 5,
        shadowColor: '#e63946',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    linkButton: {
        marginTop: 25,
        padding: 10
    },
    linkText: {
        color: '#e63946',
        fontSize: 14,
        fontWeight: '600'
    }
});