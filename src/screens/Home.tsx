// Importe os componentes necessários do React Native
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

// Defina o componente funcional Home
const Home = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#6dac6a' }]}
                onPress={() => navigation.navigate('Teste')}
            >
                <Text style={styles.buttonText}>Teste</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#acab6a' }]}
                onPress={() => navigation.navigate('LerEscrever')}
            >
                <Text style={styles.buttonText}>Ler e Escrever</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#6a8cac' }]}
                onPress={() => navigation.navigate('Passaporte')}
            >
                <Text style={styles.buttonText}>Passaporte</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#6a6eac' }]}
                onPress={() => navigation.navigate('Teste2')}
            >
                <Text style={styles.buttonText}>Teste 2</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#6e6aac' }]}
                onPress={() => navigation.navigate('TransceiveTest')}
            >
                <Text style={styles.buttonText}>TransceiveTest</Text>
            </TouchableOpacity>
        </View>
    );
};

// Estilos para o componente
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#b3b3b3',
        padding: 10,
        margin: 10, 
        borderRadius: 8,
        width: '80%',
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
    },
});

export default Home;
