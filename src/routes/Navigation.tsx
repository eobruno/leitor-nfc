// Importe os componentes necessários do React
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importe os componentes de tela
import Home from '../screens/Home';

;
import Teste from '../screens/Teste';
import Teste2 from '../screens/Teste2';
import Teste3 from '../screens/Teste3';
import Teste4 from '../screens/Teste4';
import Teste5 from '../screens/Teste5';

// Crie o Stack Navigator
const Stack = createNativeStackNavigator();

// Defina o componente de navegação
const Navigation: React.FC = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="Teste" component={Teste} />
                <Stack.Screen name="Teste2" component={Teste2} />
                <Stack.Screen name="Teste3" component={Teste3} />
                <Stack.Screen name="Teste4" component={Teste4} />
                <Stack.Screen name="Teste5" component={Teste5} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation;
