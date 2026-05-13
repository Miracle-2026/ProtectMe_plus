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
            const response = await fetch(`${SERVER_URL}/api/contacts`, {
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
                    relationship,
                    is_primary: isPrimary
                })
            });
            const data = await response.json();
            if (response.ok) {
                setContacts([...contacts, data.contact]);
                resetForm();
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not add contact');
        }
    };

    const toggleBlock = async (id, currentStatus) => {
        try {
            const token = await AsyncStorage.getItem('protectme_token');
            const response = await fetch(`${SERVER_URL}/api/contacts/${id}/block`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ is_blocked: !currentStatus })
            });

            if (response.ok) {
                setContacts(contacts.map(c => c.id === id ? { ...c, is_blocked: !currentStatus } : c));
            }
        } catch (error) {
            Alert.alert('Error', 'Could not update privacy settings');
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

    const resetForm = () => {
        setName('');
        setPhone('');
        setRelationship('');
        setIsPrimary(false);
        setAdding(false);
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
            <Text style={styles.title}>Emergency Network</Text>

            {adding ? (
                <View style={styles.addForm}>
                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#666" value={name} onChangeText={setName} />
                    <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#666" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                    <TextInput style={styles.input} placeholder="Relationship (e.g. Brother)" placeholderTextColor="#666" value={relationship} onChangeText={setRelationship} />
                    
                    <TouchableOpacity style={styles.primaryToggle} onPress={() => setIsPrimary(!isPrimary)}>
                        <Text style={styles.primaryToggleText}>
                            {isPrimary ? '★ Primary Responder' : '☆ Set as Primary Responder'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.formButtons}>
                        <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={() => setAdding(false)}>
                            <Text style={styles.formButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.formButton, styles.saveButton]} onPress={addContact}>
                            <Text style={styles.formButtonText}>Save Contact</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
                    <Text style={styles.addButtonText}>+ Add Emergency Contact</Text>
                </TouchableOpacity>
            )}

            {contacts.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>Network Empty</Text>
                    <Text style={styles.emptySubtext}>Add contacts who will receive SOS alerts (FR-02)</Text>
                </View>
            ) : (
                contacts.map(contact => (
                    <View key={contact.id} style={[styles.contactCard, contact.is_blocked && styles.blockedCard]}>
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
                            <Text style={styles.contactRelationship}>{contact.relationship || 'Contact'}</Text>
                        </View>
                        
                        <View style={styles.actionColumn}>
                            {/* FR-07: Blocking capability */}
                            <TouchableOpacity onPress={() => toggleBlock(contact.id, contact.is_blocked)} style={styles.iconButton}>
                                <Text style={styles.iconText}>{contact.is_blocked ? '🔒' : '🔓'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteContact(contact.id)} style={styles.iconButton}>
                                <Text style={styles.iconText}>🗑</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', padding: 20 },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: '#e63946', marginBottom: 25, marginTop: 40 },
    addButton: { backgroundColor: '#121212', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e63946', marginBottom: 20 },
    addButtonText: { color: '#e63946', fontSize: 16, fontWeight: 'bold' },
    addForm: { backgroundColor: '#121212', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    input: { backgroundColor: '#050505', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
    primaryToggle: { padding: 10, alignItems: 'center', marginBottom: 10 },
    primaryToggleText: { color: '#e63946', fontWeight: '600' },
    formButtons: { flexDirection: 'row', gap: 10 },
    formButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
    cancelButton: { backgroundColor: '#222' },
    saveButton: { backgroundColor: '#e63946' },
    formButtonText: { color: '#fff', fontWeight: 'bold' },
    contactCard: { backgroundColor: '#121212', borderRadius: 16, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    blockedCard: { borderColor: '#e63946', opacity: 0.7 },
    contactInfo: { flex: 1 },
    contactNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    contactName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
    primaryBadge: { backgroundColor: '#e63946', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    primaryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    contactPhone: { color: '#888', fontSize: 14, marginBottom: 2 },
    contactRelationship: { color: '#555', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    actionColumn: { alignItems: 'center', gap: 15 },
    iconButton: { padding: 5 },
    iconText: { fontSize: 22 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    emptySubtext: { color: '#666', fontSize: 14, marginTop: 10, textAlign: 'center' }
});