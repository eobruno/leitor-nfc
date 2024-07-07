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
  console.log('Mrz', mrzData);

  try {
    console.log("Solicitando tecnologia NFC...");
    await NfcManager.requestTechnology(tech, {
      alertMessage: "Pronto para ler o chip do passaporte!",
    });

    // 1. Derivação de Chaves a partir do MRZ (Key Derivation)
    console.log("1. Derivando Chave Kpi do MRZ...");
    console.log("\n");
    const kpi = deriveKpiFromMRZ(mrzData);
    console.log("Kpi:", kpi);
    const { kEnc, kMac } = deriveBacKey(kpi);
    console.log("Chaves derivadas:");
    console.log("kEnc =", kEnc);
    console.log("kMac =", kMac);
    console.log("\n");

    // 2. Envia um comando NFC para obter um nonce (desafio)
    console.log("2. Solicitando desafio getChallenge...");
    const rndIC = await getChallenge();
    console.log("rndIC:", rndIC);
    console.log("\n");

    // 3. Gera valores rndIFD e kIFD usados na operação de criptografia.
    console.log("3. Gerando valores rndIFD e kIFD...");
    const keyMaterial = generateNonceAndKeyingMaterial();
    const rndIFD = keyMaterial.rndIFD;
    const kIFD = keyMaterial.kIFD;

    console.log('kEnc', kEnc);
    console.log('kMac', kMac);
    console.log('rndIFD', rndIFD);
    console.log('rndIC', rndIC);
    console.log('kIFD', kIFD);
    console.log("\n");

    // 4. Gera um criptograma (eIFD) e um checksum (mIFD)
    console.log("4. Gerando um criptograma (eIFD) e um checksum (mIFD)...");
    const { eIFD, mIFD } = computeCryptogramAndChecksum(
      kEnc,
      kMac,
      rndIFD,
      rndIC,
      kIFD
    );
    console.log("\n");
    console.log("Criptograma e Checksum:");
    console.log("eIFD", eIFD,);
    console.log("mIFD", mIFD);
    console.log("\n");

    // 5. Autenticação mútua: envia um comando NFC para autenticar o chip
    console.log('Autenticando...');
    const authResponse = await externalAuthenticate(eIFD, mIFD);
    console.log("Resposta da autenticação externa:", authResponse);

    if (!authResponse || authResponse.length < 24) {
      throw new Error('Resposta inválida da autenticação externa.');
    }

    const kIC = authResponse.slice(8, 24);
    const { kSEnc, kSMac } = verifyAndDeriveSessionKeys(
      kEnc,
      kMac,
      authResponse.slice(0, 8),
      kIC,
      rndIFD,
      kIFD
    );
    console.log("Chaves de sessão derivadas: kSEnc =", kSEnc, "kSMac =", kSMac);

    const readCommand = [0x00, 0xb0, 0x00, 0x00, 0x10];
    const readResponse = await sendCommand(readCommand);
    console.log("Resposta da leitura dos dados do passaporte:", readResponse);
  } catch (ex) {
    console.warn('Erro durante o processamento:', ex);
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

// Função de envio dos Comandos para o chip
async function sendCommand(command: number[]): Promise<Uint8Array> {
  let response: any;
  console.log('COMANDO >', command);
  try {
    if (Platform.OS === "ios") {
      response = await NfcManager.sendCommandAPDUIOS(command);
      console.log('Resposta:', response);
    } else {
      response = await NfcManager.transceive(command);
    }
    console.log('\n');
    if (typeof response === "object" && response.response) {
      return new Uint8Array(response.response);
    }
    return new Uint8Array(response);
  } catch (error) {
    console.error('Erro no comando:', error);
    throw error;
  }
}

// A função Challenge envia um comando NFC para obter um nonce (desafio) do chip do passaporte.
async function getChallenge(): Promise<Uint8Array> {
  const command = [0x00, 0x84, 0x00, 0x00, 0x08]; // Comando GET CHALLENGE
  const response = await sendCommand(command);
  if (response.length < 8) {
    throw new Error('Resposta do desafio inválida');
  }
  return new Uint8Array(response.slice(0, 8)); // Nonce de 8 bytes gerado pelo chip
}

function generateNonceAndKeyingMaterial() {
    const rndIFD = new Uint8Array(8);
    crypto.getRandomValues(rndIFD);
    console.log(Buffer.from(rndIFD).toString('hex'));

    const kIFD = new Uint8Array(16);
    crypto.getRandomValues(kIFD);
    console.log(Buffer.from(kIFD).toString('hex'));

    return { rndIFD, kIFD };
}

// Função gera um criptograma (eIFD) e um checksum (mIFD)
function computeCryptogramAndChecksum(
  kEnc: Uint8Array,
  kMac: Uint8Array,
  rndIFD: Uint8Array,
  rndIC: Uint8Array,
  kIFD: Uint8Array
) {
  // Concatenar os Dados
  const S = new Uint8Array([...rndIFD, ...rndIC, ...kIFD]);
  console.log('S:', Buffer.from(S).toString('hex'));

  // Criptografar S com kEnc
  const eIFD = CryptoJS.TripleDES.encrypt(
    CryptoJS.enc.Hex.parse(Buffer.from(S).toString('hex')),
    CryptoJS.enc.Hex.parse(Buffer.from(kEnc).toString('hex')),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).ciphertext.toString(CryptoJS.enc.Hex);
  console.log('eIFD:', eIFD);

  // Preparar a Chave kMac para o MAC
  const kMacHex = CryptoJS.enc.Hex.parse(Buffer.from(kMac).toString('hex'));
  console.log('kMacHex:', kMacHex);

  // Gerar o Checksum (mIFD)
  const iv = CryptoJS.lib.WordArray.create(new Uint8Array(8).fill(0));
  const mIFD = CryptoJS.TripleDES.encrypt(
    CryptoJS.enc.Hex.parse(eIFD),
    kMacHex,
    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding }
  ).ciphertext.toString(CryptoJS.enc.Hex);
  console.log('mIFD:', mIFD);

  return { eIFD, mIFD };
}

// Função envia o comando de autenticação externa
async function externalAuthenticate(eIFD: string, mIFD: string): Promise<Uint8Array> {
  try {
    // Converte strings hexadecimais eIFD e mIFD para Uint8Array
    const eIFDBytes = Buffer.from(eIFD, 'hex');
    const mIFDBytes = Buffer.from(mIFD, 'hex');
    
    // Calcula o comprimento total do comando
    const length = eIFDBytes.length + mIFDBytes.length;
    console.log('Comprimento do comando:', length);

    // Monta o comando EXTERNAL AUTHENTICATE
    const command = [
      0x00,    // CLA (class byte)
      0x82,    // INS (instruction byte for EXTERNAL AUTHENTICATE)
      0x00,    // P1 (parameter byte 1)
      0x00,    // P2 (parameter byte 2)
      length,  // Lc (length of data field)
      ...eIFDBytes, // Data field (eIFD)
      ...mIFDBytes, // Data field (mIFD)
    ];
    console.log('Comando EXTERNAL AUTHENTICATE:', command);

    // Envia o comando e aguarda a resposta
    const response = await sendCommand(command);
    console.log('AUTENTICAR EXTERNAMENTE:', response);

    // Verifica se a resposta é válida
    if (response.length === 0 || (response[0] === 0x6A && response[1] === 0x88)) {
      throw new Error('Erro na autenticação externa. Comando inválido ou dados incorretos.');
    }

    // Retorna a resposta como Uint8Array
    return new Uint8Array(response);
  } catch (error) {
    // Loga e lança erro em caso de falha
    console.error('Erro na autenticação externa:', error);
    throw error;
  }
}

function verifyAndDeriveSessionKeys(
  kEnc: Uint8Array,
  kMac: Uint8Array,
  eIC: Uint8Array,
  kIC: Uint8Array,
  rndIFD: Uint8Array,
  kIFD: Uint8Array
) {
  const decryptedEIC = CryptoJS.TripleDES.decrypt(
    CryptoJS.enc.Hex.parse(Buffer.from(eIC).toString('hex')),
    CryptoJS.enc.Hex.parse(Buffer.from(kEnc).toString('hex')),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).toString(CryptoJS.enc.Hex);

  const R = new Uint8Array(
    decryptedEIC.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const derivedKey = xorBuffers(kIFD, R.slice(16, 32));
  const kSEnc = deriveSessionKey(derivedKey, "00");
  const kSMac = deriveSessionKey(derivedKey, "01");
  console.log("Chaves de sessão derivadas: kSEnc =", kSEnc, "kSMac =", kSMac);

  return { kSEnc, kSMac };
}

function xorBuffers(buffer1: Uint8Array, buffer2: Uint8Array): Uint8Array {
  const result = new Uint8Array(buffer1.length);
  for (let i = 0; i < buffer1.length; i++) {
    result[i] = buffer1[i] ^ buffer2[i];
  }
  return result;
}

function deriveSessionKey(derivedKey: Uint8Array, constant: string): string {
  const keyMaterial = new Uint8Array([
    ...derivedKey,
    ...constant.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  ]);
  return CryptoJS.TripleDES.encrypt(
    CryptoJS.enc.Hex.parse(Buffer.from(keyMaterial).toString('hex')),
    CryptoJS.enc.Hex.parse(Buffer.from(derivedKey).toString('hex')),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
  ).ciphertext.toString();
}

// Função de Derivação de Chave
function deriveKpiFromMRZ(mrzData: MrzData): Uint8Array {
  const { documentNumber, dateOfBirth, dateOfExpiry } = mrzData;
  const mrzInfo = documentNumber.padEnd(9, "<") + dateOfBirth + dateOfExpiry;
  const hash = CryptoJS.SHA1(mrzInfo).toString();
  const kpi = new Uint8Array(
    hash.slice(0, 32).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  return kpi;
}

// A função divide a chave kpi em duas partes, kEnc e kMac, que serão usadas para criptografia e MAC
function deriveBacKey(kpi: Uint8Array): {
  kEnc: Uint8Array;
  kMac: Uint8Array;
} {
  const kEnc = kpi.slice(0, 8);
  const kMac = kpi.slice(8, 16);
  return { kEnc, kMac };
}
