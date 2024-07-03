import React from 'react';
import { View, Text, Button, Platform } from 'react-native';
import NfcManager, { NfcEvents, NfcTech } from 'react-native-nfc-manager';
import CryptoJS from 'crypto-js';

interface MRZInfo {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

const mrzMock = {
  documentNumber: 'FH445810',
  dateOfBirth: '800422',
  dateOfExpiry: '180221'
};

const Teste2 = () => {

  async function authenticateBAC() {
    try {
      // Inicia o NfcManager
      await NfcManager.start();
      
      // Verifica se o NFC é suportado e habilitado
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) throw new Error('NFC não é suportado neste dispositivo');
      
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) throw new Error('NFC não está habilitado');
      
      // Solicita a tecnologia IsoDep
      await NfcManager.requestTechnology(NfcTech.IsoDep);
  
      // Lê a tag
      const tag = await NfcManager.getTag();
      if (!tag) throw new Error('Nenhuma tag detectada');

      console.log('Tag lida:', tag);
  
      // Deriva a chave BAC usando os dados do MRZ
      const bacKey = deriveBacKey(mrzMock);
      console.log('Chave BAC derivada:', bacKey);
  
      // Comando APDU para o BAC
      const apduCommand = [0x00, 0xA2, 0x00, 0x00, 0x10, ...bacKey]; // Exemplo: [CLA, INS, P1, P2, Lc, Data]
      console.log('Comando APDU enviado:', apduCommand);
  
      let response;
  
      // Envia o comando APDU para o chip
      if (Platform.OS === 'android') {
        response = await NfcManager.transceive({ data: apduCommand });
      } else if (Platform.OS === 'ios') {
        response = await NfcManager.sendCommandAPDUIOS(apduCommand);
      }

      console.log('Resposta ao comando APDU:', response);

      if (!response || response.length < 2) {
        throw new Error('Resposta ao comando APDU inválida');
      }

      const sw1 = response[response.length - 2];
      const sw2 = response[response.length - 1];
      const status = (sw1 << 8) | sw2;
      const data = response.slice(0, -2);

      if (status === 0x9000) {
        console.log('Autenticação BAC bem-sucedida');
        console.log('Dados retornados:', data);
      } else {
        throw new Error(`Erro na autenticação BAC: 0x${status.toString(16)}`);
      }
  
      // Leitura de dados adicionais do chip (por exemplo, DG1)
      const dg1Command = [0x00, 0xA2, 0x01, 0x0C, 0x00]; // Exemplo de comando APDU para ler DG1
      let dg1Response;
  
      if (Platform.OS === 'android') {
        dg1Response = await NfcManager.transceive({ data: dg1Command });
      } else if (Platform.OS === 'ios') {
        dg1Response = await NfcManager.sendCommandAPDUIOS(dg1Command);
      }

      console.log('Dados DG1 lidos:', dg1Response);
  
    } catch (error) {
      console.error('Erro na autenticação BAC:', error);
    } finally {
      // Fechar a conexão com a tag
      await NfcManager.cancelTechnologyRequest();
      await NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    }
  }

  function deriveBacKey(mrzInfo: MRZInfo): Uint8Array {
    const keyData = `${mrzInfo.documentNumber}${mrzInfo.dateOfBirth}${mrzInfo.dateOfExpiry}`;
    const password = CryptoJS.PBKDF2(keyData, 'SecurePassphrase', {
      keySize: 16 / 4, // 16 bytes key for AES
      iterations: 1000,
      hasher: CryptoJS.algo.SHA256,
    });
    const key = CryptoJS.enc.Hex.parse(password.toString(CryptoJS.enc.Hex));
    return new Uint8Array(key.words.map(word => [word >> 24, (word >> 16) & 0xff, (word >> 8) & 0xff, word & 0xff]).flat());
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>NFC - TESTE 2</Text>
      <Button title="Ler Chip do Passaporte" onPress={authenticateBAC} />
    </View>
  );
};

export default Teste2;
