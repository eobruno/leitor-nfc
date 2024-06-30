import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Teste: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Esta é a tela de Teste!</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    text: {
        fontSize: 18,
    },
});

export default Teste;
