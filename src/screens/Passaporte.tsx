import React from "react";
import { View, Text, Button, Platform } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import CryptoJS from "crypto-js";
import { deriveBacKey } from "../util/BACKey";
import { randomBytes } from "react-native-randombytes";

const mrz = {
  documentNumber: "FH445810",
  dateOfBirth: "800422",
  dateOfExpiry: "180221",
};

const Passaporte = () => {
  const readPassportChip = async () => {
    console.log("Iniciando leitura do chip de passaporte...");
    try {
      const tech = Platform.OS === "ios" ? NfcTech.IsoDep : NfcTech.IsoDep;
      console.log("Solicitando tecnologia NFC...");
      await NfcManager.requestTechnology(tech, {
        alertMessage: "Pronto para ler o chip do passaporte!",
      });
      console.log("Tecnologia solicitada com sucesso");

      const tag = await NfcManager.getTag();
      console.log("Tag lida:", tag);

      await selectAppCommand();

      const challenge = await getChallengeCommand();
      console.log("Desafio (RND.ICC):", challenge);

      const bacKey = deriveBacKey(mrz);
      console.log(
        "Chave BAC derivada:",
        Array.from(bacKey)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
      );

      await mutualAuthCommand(challenge, bacKey);
      await selectFileCommand();
      await readBinaryCommand();
    } catch (error) {
      console.error(
        "Erro ao solicitar tecnologia NFC ou durante a leitura do chip:",
        error
      );
    } finally {
      await NfcManager.cancelTechnologyRequest();
      console.log("Requisição de tecnologia cancelada");
    }
  };

  // 1. Seleção do Aplicativo
  const selectAppCommand = async () => {
    const commandSelect = [
      0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01,
      0x00,
    ];

    const commandSelectTest = [0x00, 0x84, 0x00, 0x00, 0x08];

    try {
      let responseSelectApp;

      if (Platform.OS === "ios") {
        responseSelectApp = await NfcManager.sendCommandAPDUIOS(commandSelectTest);
      } else {
        responseSelectApp = await NfcManager.transceive(commandSelect);
      }
      console.log("Seleção do Aplicativo:", responseSelectApp);
    } catch (error) {
      console.error("Erro na Seleção do Aplicativo:", error);
    }
  };

  // 2. Get Challenge
  const getChallengeCommand = async () => {
    const commandGetChallenge = {
      cla: 0x00,
      ins: 0x84,
      p1: 0x00,
      p2: 0x00,
      data: [],
      le: 0x08,
    };

    try {
      let responseGetChallenge;

      if (Platform.OS === "ios") {
        responseGetChallenge = await NfcManager.sendCommandAPDUIOS(
          commandGetChallenge
        );
      } else {
        responseGetChallenge = await NfcManager.transceive([
          0x00, 0x84, 0x00, 0x00, 0x08,
        ]);
      }
      console.log("Resposta ao comando Get Challenge:", responseGetChallenge);
      const challenge = responseGetChallenge.response;
      console.log("Desafio (RND.ICC):", challenge);

      return challenge;
    } catch (error) {
      console.error("Erro ao obter desafio:", error);
    }
  };

  // 3. Autenticação Mútua
  const mutualAuthCommand = async (challenge, bacKey) => {
    let ksEncArray;
    let encryptedToken;
    let rndIFDArray;
    let token;

    // Gerar KSenc e KSmac
    try {
      const bacKeyArray = Array.from(bacKey); // Garante que bacKey é um array de bytes

      ksEncArray = CryptoJS.SHA1(
        CryptoJS.lib.WordArray.create([...bacKeyArray, 0, 0, 0, 1])
      )
        .toString(CryptoJS.enc.Hex)
        .slice(0, 16);
      const ksMacArray = CryptoJS.SHA1(
        CryptoJS.lib.WordArray.create([...bacKeyArray, 0, 0, 0, 2])
      )
        .toString(CryptoJS.enc.Hex)
        .slice(0, 16);

      console.log("KSenc:", ksEncArray);
      console.log("KSmac:", ksMacArray);
    } catch (error) {
      console.error("Erro ao gerar KSenc e KSmac:", error);
    }

    try {
      // Gerar RND.IFD usando react-native-randombytes
      rndIFDArray = await new Promise((resolve, reject) => {
        randomBytes(8, (err, bytes) => {
          if (err) {
            reject(err);
          } else {
            resolve(bytes.toString("hex"));
          }
        });
      });
      console.log("RND.IFD:", rndIFDArray);

      // Concatenar RND.IFD, RND.ICC e um identificador de sequência de bits
      const kic = challenge.join("");
      token = CryptoJS.enc.Hex.parse(rndIFDArray + kic + "0000000000000000");
      console.log("Token concatenado:", token.toString(CryptoJS.enc.Hex));

      // Criptografar o token usando 3DES
      encryptedToken = CryptoJS.TripleDES.encrypt(
        token,
        CryptoJS.enc.Hex.parse(ksEncArray),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.NoPadding,
        }
      ).ciphertext.toString(CryptoJS.enc.Hex);

      console.log("Token criptografado:", encryptedToken);
    } catch (error) {
      console.error(
        "Concatenar RND.IFD, RND.ICC ou criptografar token:",
        error
      );
    }

    const commandMutualAuth = [
      0x00,
      0x82,
      0x00,
      0x00,
      encryptedToken.length / 2,
      ...encryptedToken.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
    ];

    try {
      const responseMutualAuth = await NfcManager.sendCommandAPDUIOS(
        commandMutualAuth
      );
      console.log(
        "Resposta ao comando de Autenticação Mútua:",
        responseMutualAuth
      );
    } catch (error) {
      console.error("Erro na Autenticação Mútua:", error);
    }
  };

  // 4. Seleção de Arquivo (por exemplo, DG1)
  const selectFileCommand = async () => {
    const commandSelectDG1 = [
      0x00,
      0xa4,
      0x04,
      0x0c,
      0x02,
      0x5f,
      0x1f,
      0x00, // Exemplo de comando para selecionar DG1
    ];

    try {
      const responseSelectDG1 = await NfcManager.sendCommandAPDUIOS(
        commandSelectDG1
      );
      console.log("Seleção de Arquivo DG1:", responseSelectDG1);
    } catch (error) {
      console.error("Erro na Seleção de Arquivo DG1:", error);
    }
  };

  // 5. Leitura de Dados Binários
  const readBinaryCommand = async () => {
    const commandReadBinary = {
      cla: 0x00,
      ins: 0xb0,
      p1: 0x00,
      p2: 0x00,
      data: [],
      le: 0x00, // Ler até o fim do arquivo
    };

    try {
      const responseReadBinary = await NfcManager.sendCommandAPDUIOS(
        commandReadBinary
      );
      console.log("Dados Binários Lidos:", responseReadBinary);
    } catch (error) {
      console.error("Erro ao Ler Dados Binários:", error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>PASSAPORTE</Text>
      <Button title="Read Passport Chip" onPress={readPassportChip} />
    </View>
  );
};

export default Passaporte;
