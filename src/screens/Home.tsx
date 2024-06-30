import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Home: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Bem-vindo à tela Home!</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default Home;
