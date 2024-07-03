import React, { useEffect } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

const TransceiveTest = () => {
  useEffect(() => {
    const initNfcManager = async () => {
      await NfcManager.start();
      await NfcManager.setEventListener('stateChange', (state) => {
        console.log('Estado NFC mudou:', state);
      });

      await NfcManager.setEventListener('discoverTag', async (tag) => {
        console.log('Tag descoberta:', tag);
        await testTransceive();
      });
    };

    initNfcManager();

    return () => {
      NfcManager.unregisterTagEvent().catch(error => console.error('Erro ao desregistrar evento de tag:', error));
      NfcManager.stop();
    };
  }, []);

  const testTransceive = async () => {
    try {
      let tech = Platform.OS === 'ios' ? NfcTech.IsoDep : NfcTech.IsoDep;
      await NfcManager.requestTechnology(tech, {
        alertMessage: 'Pronto para testar o comando transceive!'
      });
      console.log('Tecnologia solicitada com sucesso');

      // Comando APDU de exemplo para testar o transceive
      const exampleCommand = [0x00, 0xA4, 0x04, 0x00, 0x02, 0x3F, 0x00]; // Exemplo: SELECT FILE
      const response = await NfcManager.transceive(exampleCommand);

      console.log('Resposta do comando transceive:', response);
      if (response) {
        console.log('Transceive bem-sucedido!');
      } else {
        console.log('Falha no comando transceive.');
      }
    } catch (error) {
      console.error('Erro no transceive:', error);
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Teste do Comando `transceive`</Text>
      <Button title="Testar Transceive" onPress={testTransceive} />
    </View>
  );
};

export default TransceiveTest;
