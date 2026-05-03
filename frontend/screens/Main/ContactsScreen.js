import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../../config';

export default function ContactsScreen() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [relationship, setRelationship] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/ccontacts`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            if (response.ok) setContacts(data.contacts);
        } catch (error) {
            console.error('Fetch contacts error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addContact = async () => {
        if (!name || !phone) {
            Alert.alert('Error', 'Name and phone number are required');
            return;
        }
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    contact_name: name,
                    contact_phone: phone,
                    relatonship,
                    is_primary: isPrimary
                })
            });
            const data = await response.json();
            if (response.ok) {
                setContacts([...contacts, data.contact]);
                setName('');
                setPhone('');
                setRelationship('');
                setIsPrimary(false);
                setAdding(false);
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not add contact');
        }
    };

    const deleteContact = async (id) => {
        Alert.alert('Delete Contact', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('protectme_token');
                        const response = await fetch(`${SERVER_URL}/api/contacts/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (response.ok) {
                            setContacts(contacts.filter(c => c.id !== id));
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Could not delete contact');
                    }
                }
            }
        ]);
    };

    if (loading) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e63946" />
        </View>
    );
}

return (
    <ScrollView style={styles.container}>
        <Text style={styles.title}>Emergency Contacts</Text>

        {adding ? (
            <View style={styles.addForm}>
                <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeeholderTextColor="#666"
                value={name}
                onChangeText={setName}
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
                syle={styles.input}
                placeholder="Relationship (e.g. Father)"
                placeholderTextColor="#666"
                value={relationship}
                onChangeText={setRelationship}
                />
                <TouchableOpacity
                style={styles.primaryToggle}
                onPress={() => setIsPrimary(!isPrimary)}
                >
                    <Text style={styles.primaryToggleText}>
                        {isPrimary ? '★ Primary Contact' : '☆ Set as Primary Contact'}
                    </Text>
                </TouchableOpacity>
                <View style={styles.formButtons}>
                    <TouchableOpacity
                    style={[styles.formButton, styles.cancelButton]}
                    onPress={() => setAdding(false)}
                    >
                        <Text style={styles.formButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    style={[styles.formButton, styles.saveButton]}
                    onPress={addContact}
                    >
                        <Text style={styles.formButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ) : (
            <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAdding(true)}
            >
                <Text style={styles.addButtonText}>+ Add Emergency Contact</Text>
            </TouchableOpacity>
        )}

        {contacts.length === 0 ? (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No Emergency Contacts</Text>
                <Text style={styles.emptySubtext}>
                    Add contacts who will be notified during an SOS
                </Text>
            </View>
        ) : (
            contacts.map(contact => (
                <View key={contact.id} style={styles.contactCard}>
                    <View style={styles.contactInfo}>
                        <View style={styles.contactNameRow}>
                            <Text style={styles.contactName}>{contact.contact_name}</Text>
                            {contact.is_primary && (
                                <View style={styles.primaryBadge}>
                                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.contactPhone}>{contact.contact_phone}</Text>
                        {contact.relationship && (
                            <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                        )}
                    </View>
                    <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteContact(contact.id)}
                    >
                        <Text style={styles.deleteButtonText}>🗑</Text>
                    </TouchableOpacity>
                </View>
            ))
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
    loadingContainer: { flex: 1, backgrounColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#e63946', marginBottom: 20, marginTop: 10 },
    addButton: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e63946',
        marginBottom: 20
    },
    addButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
    addForm: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    input: {
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 15
    },
    primaryToggle: {
        padding: 12,
        alignItems: 'center',
        marginBottom: 10
    },
    primaryToggleText: { color: '#e63946', fontSize: 15 },
    formButtons: { flexDirection: 'row', gap: 10 },
    formButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#333' },
    saveButton: { backgroundColor: '#e63946' },
    formButtonText: { color: '#ffffff', fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    emptySubtext: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
    contactCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    contactInfo: { flex: 1 },
    contactNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    contactName: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
    primaryBadge: { backgroundColor: '#e63946', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    primaryBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
    contactPhone: { color: '#aaa', fontSize: 14 },
    contactRelationship: { color: '#666', fontSize: 12, marginTop: 2 },
    deleteButton: { padding: 8 },
    deleteButtonText: { fontSize: 20 }
});