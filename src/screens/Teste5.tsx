import React from "react";
import {
  SafeAreaView,
  View,
  Button,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import { accessPassportChip } from "../util/passaportReader5";

// Inicialização do gerenciador NFC
NfcManager.start();

const Teste5 = () => {
  const handleReadPassport = async () => {
    try {
      const mrzData = {
        documentNumber: "FH445810",
        dateOfBirth: "800422",
        dateOfExpiry: "180221",
      };
      const resultado = await accessPassportChip(mrzData);
      console.log('resultado', resultado)
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Ocorreu um erro ao ler o passaporte.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <View><Text>TESTE 5</Text></View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#7bac6a" }]}
          onPress={handleReadPassport}
        >
          <Text style={styles.buttonText}>LER CHIP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  buttonContainer: {
    margin: 10,
  },
  button: {
    backgroundColor: "#b3b3b3",
    padding: 10,
    margin: 10,
    borderRadius: 8,
    width: 250,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});

export default Teste5;
