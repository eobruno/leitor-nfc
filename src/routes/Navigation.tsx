// Importe os componentes necessários do React
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importe os componentes de tela
import Home from '../screens/Home';
import Teste from '../screens/Teste';
import Passaporte from '../screens/Passaporte';
import LerEscrever from '../screens/LerEscrever';
import TransceiveTest from '../screens/TransceiveTest';
import Teste2 from '../screens/Teste2';

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
                <Stack.Screen name="Passaporte" component={Passaporte} />
                <Stack.Screen name="LerEscrever" component={LerEscrever} />
                <Stack.Screen name="TransceiveTest" component={TransceiveTest} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation;
