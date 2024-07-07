import NfcManager, { NfcTech } from "react-native-nfc-manager";
import CryptoJS from "crypto-js";
import { Platform } from "react-native";
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

interface MrzData {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

export async function accessPassportChip(mrzData: MrzData) {
  const tech = Platform.OS === "ios" ? NfcTech.IsoDep : NfcTech.IsoDep;

  try {
    console.log("Solicitando tecnologia NFC...");
    await NfcManager.requestTechnology(tech, {
      alertMessage: "Pronto para ler o chip do passaporte!",
    });
    console.log("Tecnologia solicitada com sucesso");

    const tag = await NfcManager.getTag();
    console.log("Tag lida:", tag);

    // Selecionar aplicativo eMRTD com o novo comando
    const commandSelect = [0x00, 0x84, 0x00, 0x00, 0x08]; // Comando alterado para a seleção do aplicativo
    const selectResponse = await sendCommand(commandSelect);
    console.log("Select eMRTD Application response:", selectResponse);

    // Derivar chaves de acesso básico
    const { kEnc, kMac } = deriveBacKey(mrzData);

    // Solicitar desafio
    const rndIC = await getChallenge();

    // Gerar nonce e material de chave
    const keyMaterial: any = generateNonceAndKeyingMaterial();
    console.log('keyMaterial ', keyMaterial);
    const rndIFD = keyMaterial._j.rndIFD
    console.log('rndIFD', rndIFD);
    const kIFD = keyMaterial._j.kIFD
    console.log('kIFD', kIFD);

    // Computar criptograma e checksum
    const { eIFD, mIFD } = computeCryptogramAndChecksum(
      kEnc,
      kMac,
      rndIFD,
      rndIC,
      kIFD
    );

    // Enviar comando EXTERNAL AUTHENTICATE
    const authResponse = await externalAuthenticate(eIFD, mIFD);



    // Verificar resposta e derivar chaves de sessão
    const kIC = authResponse.slice(8, 24); // Exemplo para obter kIC
    const { kSEnc, kSMac } = verifyAndDeriveSessionKeys(
      kEnc,
      kMac,
      authResponse.slice(0, 8),
      authResponse.slice(8, 24),
      rndIFD,
      kIFD
    );

    // Ler dados do passaporte
    const readCommand = [0x00, 0xb0, 0x00, 0x00, 0x10]; // Exemplo de comando para ler dados
    const readResponse = await sendCommand(readCommand);
    console.log("Read passport data response:", readResponse);
  } catch (ex) {
    console.warn(ex);
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

// Função para enviar comandos NFC
async function sendCommand(command: number[]): Promise<Uint8Array> {
  let response: any;
  console.log('COMMAND >', command);

  try {
    if (Platform.OS === "ios") {
      response = await NfcManager.sendCommandAPDUIOS(command);
    } else {
      response = await NfcManager.transceive(command);
    }
    // Verifique se a resposta contém o objeto esperado
    if (typeof response === "object" && response.response) {
      return new Uint8Array(response.response);
    }
  
    return new Uint8Array(response);
    
  } catch (error) {
    console.error('Erro no comando:', error);
  }


}

// Função para solicitar desafio
async function getChallenge(): Promise<Uint8Array> {
  const command = [0x00, 0x84, 0x00, 0x00, 0x08]; // Comando GET CHALLENGE
  const response = await sendCommand(command);
  return new Uint8Array(response.slice(0, 8)); // Nonce de 8 bytes gerado pelo chip
}

async function generateNonceAndKeyingMaterial() {
    const rndIFD = new Uint8Array(8);
    crypto.getRandomValues(rndIFD);
    console.log(Buffer.from(rndIFD).toString('hex'));  // Exibir como string hexadecimal

    const kIFD = new Uint8Array(16);
    crypto.getRandomValues(kIFD);
    console.log(Buffer.from(kIFD).toString('hex'));  // Exibir como string hexadecimal

    return { rndIFD: Buffer.from(rndIFD).toString('hex'), kIFD: Buffer.from(kIFD).toString('hex') };
}

generateNonceAndKeyingMaterial().then(({ rndIFD, kIFD }) => {
    console.log('rndIFD:', rndIFD);
    console.log('kIFD:', kIFD);
});

// Função para computar criptograma e checksum
function computeCryptogramAndChecksum(
  kEnc: Uint8Array,
  kMac: Uint8Array,
  rndIFD: Uint8Array,
  rndIC: Uint8Array,
  kIFD: Uint8Array
) {
  const S = new Uint8Array([...rndIFD, ...rndIC, ...kIFD]);
  console.log('S', S);
  const eIFD = CryptoJS.TripleDES.encrypt(
    CryptoJS.enc.Hex.parse(S.toString()),
    CryptoJS.enc.Hex.parse(kEnc.toString()),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).toString();
  console.log('EIFD', eIFD);
  let eIFDHex = CryptoJS.enc.Hex.parse(eIFD);
  console.log('eIFDHex', eIFDHex);
  let kMacHex = CryptoJS.enc.Hex.parse(kMac.toString());
  console.log('kMacHex', kMacHex);

  // Criação do vetor de inicialização (IV) com zeros
  const iv = CryptoJS.lib.WordArray.create(new Uint8Array(8).fill(0));

  // Encrypting mIFD using TripleDES with CBC mode, NoPadding, and IV
  const mIFD = CryptoJS.TripleDES.encrypt(
    eIFD,
    kMacHex,
    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
  ).ciphertext.toString(CryptoJS.enc.Hex);
  console.log('mIFD', mIFD);

  return { eIFD, mIFD };
}

// Função para enviar comando EXTERNAL AUTHENTICATE
async function externalAuthenticate(eIFD: string, mIFD: string): Promise<Uint8Array> {
  console.log('Autenticando...');
  try {
    const eIFDBytes = eIFD.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];
    const mIFDBytes = mIFD.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];

    const command = [
      0x00,
      0x82,
      0x00,
      0x00,
      eIFDBytes.length + mIFDBytes.length,
      ...eIFDBytes,
      ...mIFDBytes,
    ];

    console.log('command', command);
    let response;
    const func1 = (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          response = sendCommand(command);
        }, 1000);
      });
    };
    console.log('externalAuthenticate response:', response);
    return new Uint8Array(response);
  } catch (error) {
    console.error('Error externalAuthenticate', error);
    throw error;
  }
}

// Função para verificar resposta e derivar chaves de sessão
function verifyAndDeriveSessionKeys(
  kEnc: Uint8Array,
  kMac: Uint8Array,
  eIC: string,
  mIC: string,
  rndIFD: Uint8Array,
  kIFD: Uint8Array
) {
  // Verificação do checksum
  const decryptedEIC = CryptoJS.TripleDES.decrypt(
    CryptoJS.enc.Hex.parse(eIC),
    CryptoJS.enc.Hex.parse(kEnc.toString()),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).toString(CryptoJS.enc.Hex);
  const R = new Uint8Array(
    decryptedEIC.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const derivedKey = xorBuffers(kIFD, R.slice(16, 32));
  const kSEnc = deriveSessionKey(derivedKey, "00");
  const kSMac = deriveSessionKey(derivedKey, "01");
  return { kSEnc, kSMac };
}

// Função para realizar XOR entre dois buffers
function xorBuffers(buffer1: Uint8Array, buffer2: Uint8Array): Uint8Array {
  const result = new Uint8Array(buffer1.length);
  for (let i = 0; i < buffer1.length; i++) {
    result[i] = buffer1[i] ^ buffer2[i];
  }
  return result;
}

// Função para derivar chave de sessão
function deriveSessionKey(derivedKey: Uint8Array, constant: string): string {
  const keyMaterial = new Uint8Array([
    ...derivedKey,
    ...constant.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  ]);
  return CryptoJS.TripleDES.encrypt(
    CryptoJS.enc.Hex.parse(keyMaterial.toString()),
    CryptoJS.enc.Hex.parse(derivedKey.toString()),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).toString();
}

// Função para derivar as chaves de acesso básico
function deriveBacKey(mrzData: MrzData): {
  kEnc: Uint8Array;
  kMac: Uint8Array;
} {
  const { documentNumber, dateOfBirth, dateOfExpiry } = mrzData;
  const mrzInfo = documentNumber.padEnd(9, "<") + dateOfBirth + dateOfExpiry;
  const hash = CryptoJS.SHA1(mrzInfo).toString();
  const kEnc = new Uint8Array(
    hash
      .slice(0, 16)
      .match(/.{1,2}/g)!
      .map((byte) => parseInt(byte, 16))
  );
  const kMac = new Uint8Array(
    hash
      .slice(16, 32)
      .match(/.{1,2}/g)!
      .map((byte) => parseInt(byte, 16))
  );
  console.log("\n");
  console.log("kEnc", kEnc);
  console.log("kMac", kMac);
  console.log("\n");
  return { kEnc, kMac };
}
