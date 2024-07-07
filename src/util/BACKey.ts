import SHA1 from 'crypto-js/sha1';
import { enc } from 'crypto-js';

export const deriveBacKey = (mrz) => {
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