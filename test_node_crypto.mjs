import crypto from 'node:crypto';

const userProvidedCiphertext = "cf95f4e4493251cf37559fec:428e6944943a8f6ea437575eac4991aaeeeca6294b49c3f64256c9a23a4b4fbc337dcc9460abac2b5fffbdd8d4647a91d34e18f9251c76d06590d6d73d2f7120dcc81484775ec1a2f659f6e80797fc294fd50dfff9dc45087665c0cde5e81d045f437509b74dccb7e7df8c5169dd1cf7f99f3963fe7972e3adf4fec3ec500f27107c23bca2172ed1d431be5d75d2729a4a";

function decryptPWNode(encodedText, keyString) {
  const [ivHex, cipherHex] = encodedText.split(":");
  if (!ivHex || !cipherHex) throw new Error("Format is not iv:ciphertext");

  const iv = Buffer.from(ivHex, 'hex');
  const cipherText = Buffer.from(cipherHex, 'hex');

  const sha256Buffer = crypto.createHash('sha256').update(keyString).digest();
  const hexKey32 = Buffer.from(sha256Buffer.toString('hex').substring(0, 32));
  const paddedKey = Buffer.from(keyString.padEnd(32, '\0'));
  const paddedKey16 = Buffer.from(keyString.padEnd(16, '\0'));

  const keysToTry = [
    { key: sha256Buffer, name: 'SHA-256' },
    { key: hexKey32, name: 'SHA-256 Hex Substring' },
    { key: paddedKey, name: 'Null Padded 32' },
    { key: paddedKey16, name: 'Null Padded 16' }
  ];

  for (let strategy of keysToTry) {
    try {
      const algo = strategy.key.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
      const decipher = crypto.createDecipheriv(algo, strategy.key, iv);
      const tag = cipherText.subarray(cipherText.length - 16);
      const encrypted = cipherText.subarray(0, cipherText.length - 16);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return { success: true, method: strategy.name, payload: decrypted };
    } catch(e) { 
        // console.log(`Method ${strategy.name} failed:`, e.message);
    }
  }
  return { success: false };
}

console.log("Testing Node Decryption...");
const result = decryptPWNode(userProvidedCiphertext, "maggikhalo");
if (result.success) {
    console.log(`SUCCESS! using ${result.method}`);
} else {
    console.log("FAILED to decrypt in Node.js");
}
