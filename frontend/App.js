import './utils/wardTracker';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startNetworkMonitor } from './utils/networkMonitor';
import { connectSocket, disconnectSocket } from './utils/socketService';

import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';
import HomeScreen from './screens/Main/HomeScreen';
import SOSScreen from './screens/Main/SOSScreen';
import MapScreen from './screens/Main/MapScreen';
import ContactsScreen from './screens/Main/ContactsScreen';
import GeofenceScreen from './screens/Main/GeofenceScreen';
import SettingsScreen from './screens/Main/SettingsScreen';
import PairingScreen from './screens/Main/PairingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
  AsyncStorage.clear();
  const unsubscribeNetwork = startNetworkMonitor();
  
  const initApp = async () => {
    await checkLoginStatus();
  };

  initApp();

  return () => {
    if (unsubscribeNetwork) {
      console.log('[APP] Cleaning up network monitor...');
      unsubscribeNetwork();
    }
    disconnectSocket();
  };
}, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('protectme_token');
      const userData = await AsyncStorage.getItem('protectme_user');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        connectSocket(user.id);
        setIsLoggedIn(true);
      }
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#050505' },
          headerTintColor: '#e63946',
          headerTitleStyle: { fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
          contentStyle: { backgroundColor: '#050505' },
          headerShadowVisible: false,
        }}
      >
        {!isLoggedIn ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen 
              name="Home" 
              options={{ headerShown: false }}
            >
              {props => <HomeScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
            
            <Stack.Screen name="SOS" component={SOSScreen} options={{ title: 'EMERGENCY SOS' }} />
            
            <Stack.Screen name="Map" component={MapScreen} options={{ title: 'SAFETY FEED' }} />
            
            <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'MY NETWORK' }} />
            
            <Stack.Screen name="Geofence" component={GeofenceScreen} options={{ title: 'SAFE ZONES' }} />
            
            <Stack.Screen name="Pairing" component={PairingScreen} options={{ title: 'DEVICE LINKING' }} />
            
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'PREFERENCES' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}