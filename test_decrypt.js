const crypto = require('crypto');

const data = "cf95f4e4493251cf37559fec:428e6944943a8f6ea437575eac4991aaeeeca6294b49c3f64256c9a23a4b4fbc337dcc9460abac2b5fffbdd8d4647a91d34e18f9251c76d06590d6d73d2f7120dcc81484775ec1a2f659f6e80797fc294fd50dfff9dc45087665c0cde5e81d045f437509b74dccb7e7df8c5169dd1cf7f99f3963fe7972e3adf4fec3ec500f27107c23bca2172e0369df8976511e1f812fe50d673e818d2b17b58c1f7d322b3cfbaff43c1d032baac682c845cf0cc40f8eb04a5509fe19450038533e21831b0d57636441c82c75797c145316e164d19225f8bfeebe3d712f7e567a0506a22f5c67f1c4b792cdf3d1ad503f7251e81db0f5a2e687bf570c3d9031b8bef0f05e9c21c8ade55041fd25e0933c727ae1f4d16ff2ed71e4320afdf3eba9dc03650f52e354d0b4588eaa0676acc24b5e29fedce0b144ff1c8b57aad5a22419a7cc924b88491c07d350905dc79cbfd4866013827b96bf258016b196c76358ecd1f179b99b1ceafbe559b4c1feb1dabe7c6bcb978022232b9d7dc7cfca9bbf87888b9cb2fb4f30b287854537066d7ab4d729ee0f17b962160cbfb6cfb1e107b72b16a32c784a9283ddbf4e8b838686850611e77cd29ba4f7f8ef178bd6ff3aa3beec38c22c879cf9034f0ae1b2d62d928baa0384d53577d4499cb497f8529e7ef4452c48a1970d46b8f441bffd29994d11ee0eb55fcc4827c2c053002183414a35eefb25d3529bbfecee3bdbf47da32e874d711546a6ab4664b9b17d59bf6e12244653df694353a296e7675dd99060481a08a39b0227b53ecabb54aa3e2db061fdc4a071b007c66205ef1f3cdae4fd72d50664aa105e5e04fccbbc1c9763b88a69e754af5a3ed34efefc3bb4821a";
const key = "maggikhalo";
const [ivHex, encryptedHex] = data.split(':');

const iv = Buffer.from(ivHex, 'hex');
const encryptedBytes = Buffer.from(encryptedHex, 'hex');

// In aes-256-cbc, IV is 16 bytes. Wait, IV here is 12 bytes!!! (24 hex chars)
// This strictly implies AES-GCM or Chacha20!
// For AES-256-GCM, IV is 12 bytes. Tag is 16 bytes.
// If it's AES-256-GCM, the last 16 bytes of encryptedHex could be the auth tag.

function tryDecrypt(algorithm, keyBuffer, authTagLength = 16) {
    try {
        let decipher;
        if (algorithm.includes('gcm')) {
            const ciphertext = encryptedBytes.subarray(0, encryptedBytes.length - authTagLength);
            const authTag = encryptedBytes.subarray(encryptedBytes.length - authTagLength);
            decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(ciphertext, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } else {
            decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
            let decrypted = decipher.update(encryptedBytes, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
    } catch (e) {
        return null;
    }
}

// Generate possible keys from 'maggikhalo'
const keys = [
    crypto.createHash('sha256').update(key).digest(),
    crypto.createHash('md5').update(key).digest(), // 16 bytes for aes-128
    Buffer.alloc(32, key, 'utf8'),
    Buffer.from(key.padEnd(32, '\0'), 'utf8'),
];

const algos = ['aes-256-gcm', 'aes-128-gcm', 'aes-192-gcm', 'aes-256-ctr', 'aes-128-ctr', 'aes-256-cbc'];

for (let a of algos) {
    for (let k of keys) {
        // Some algorithms might specifically require a 16, 24, or 32 byte key
        try {
            const res = tryDecrypt(a, k);
            if (res && res.includes('http')) {
                console.log('SUCCESS!');
                console.log('Algo:', a);
                console.log('Key type:', k.length, 'bytes');
                console.log('Output:', res);
            }
        } catch(e) {}
    }
}
