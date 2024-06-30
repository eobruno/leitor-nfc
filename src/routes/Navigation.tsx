import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home';
import Teste from '../screens/Teste';

const Stack = createNativeStackNavigator();

const Navigation: React.FC = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="Teste" component={Teste} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation;
