import React from 'react';
import { View, Text, Button, Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import SHA1 from 'crypto-js/sha1';
import { enc } from 'crypto-js';

const Passaporte = () => {

  const readPassportChip = async () => {
    console.log('Iniciando leitura do chip de passaporte...');
    try {
      let tech = Platform.OS === 'ios' ? NfcTech.IsoDep : NfcTech.IsoDep;
      console.log('Solicitando tecnologia NFC...');
      await NfcManager.requestTechnology(tech, {
        alertMessage: 'Pronto para ler o chip do passaporte!'
      });
      console.log('Tecnologia solicitada com sucesso');

      const tag = await NfcManager.getTag();
      console.log('Tag lida:', tag);

      const mrz = {
        documentNumber: 'FH445810',
        dateOfBirth: '800422',
        dateOfExpiry: '180221'
      };

      const bacKey = deriveBacKey(mrz);
      console.log('Chave BAC derivada:', Array.from(bacKey).map(byte => byte.toString(16).padStart(2, '0')).join(''));

      await authenticateWithBAC(bacKey);
      const passportData = await readChipData();
      console.log('Dados do passaporte:', passportData);

    } catch (error) {
      console.error('Erro ao solicitar tecnologia NFC ou durante a leitura do chip:', error);
    } finally {
      await NfcManager.cancelTechnologyRequest();
      console.log('Requisição de tecnologia cancelada');
    }
  };

  const deriveBacKey = (mrz) => {
    console.log(mrz);
    const documentNumber = mrz.documentNumber;
    const dateOfBirth = mrz.dateOfBirth;
    const dateOfExpiry = mrz.dateOfExpiry;

    const kSeed = documentNumber + dateOfBirth + dateOfExpiry;
    const sha1Hash = SHA1(kSeed);
    console.log('sha1Hash:', sha1Hash.toString());

    const keyHex = sha1Hash.toString(enc.Hex);
    const keyArray = Uint8Array.from(
      keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    const keyBuffer = keyArray.slice(0, 16);

    console.log('Chave derivada:', Array.from(keyBuffer).map(byte => byte.toString(16).padStart(2, '0')).join(''));
    console.log('Buffer da chave:', keyBuffer);

    return keyBuffer;
  };

  const authenticateWithBAC = async (bacKey) => {
    const commandSelectApplet = [0x00, 0x84, 0x00, 0x00, 0x08]; // Comando que funcionou para você
    
    try {
      let responseSelectApplet;

      if (Platform.OS === 'ios') {
        responseSelectApplet = await NfcManager.sendCommandAPDUIOS(commandSelectApplet);
      } else {
        responseSelectApplet = await NfcManager.transceive(commandSelectApplet);
      }

      console.log('Resposta ao comando Select Applet:', responseSelectApplet);

    } catch (error) {
      console.error('Erro na autenticação BAC:', error);
    }
  };

  const readChipData = async () => {
    const commandReadBinary = [0x00, 0xB0, 0x00, 0x00, 0x20];
    
    try {
      let response;

      if (Platform.OS === 'ios') {
        response = await NfcManager.sendCommandAPDUIOS(commandReadBinary);
        console.log('Resposta ao comando Leitura Binária:', response);
      } else {
        response = await NfcManager.transceive(commandReadBinary);
      }

      if (response) {
        const data = parseChipData(response);
        return data;
      }
    } catch (error) {
      console.error('Erro na leitura dos dados do chip:', error);
    }
    return null;
  };

  const parseChipData = (response) => {
    const data = {}; 
    return data;
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>NFC Passport Reader</Text>
      <Button title="Read Passport Chip" onPress={readPassportChip} />
    </View>
  );
};

export default Passaporte;
