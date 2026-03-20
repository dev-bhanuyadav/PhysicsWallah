import crypto from 'node:crypto';

const userProvidedData = "252620e8db6b2f20af38eb65:a654ca6232d0712b48c64cccec917424220b9f6c96e897b11dc8bc5173d787a7ed0655bd30d7a626e616e3947c330af2cf55a2365519235c32968f39a80344262b7c6959bb950bd5964bba270455c42da4566c81559cd77d98c3d94bb3df6af14c56f7e8d6e09ebdfe3472f7a5aea5164a78ff24339fe0fe877711c50ed949bfae47d176ce3edbad832bdbd8af782366bc003f1471cd837d95012b98bb9b4b97aba1cfcf5b3d4db56ed2212d040c1aae896211619925993ce48bc2b298ac40ceea2592ef42479ad89b4e4fe2429e86f3e0d500812c065498d9e549a3a7289310de9288566781b02ad3fc3089245ac52f06264b03d5da1a2f54d080939d0592b96ff15dca8785e8b546f6cf17c9e630377f2fa86f4164d243b8870e361886ef4bca0dc8880ee411409f8984e54de8269b67c0f76564d13816f4fffeae4345299ea5305eabf09a83ce86856915a92dad7a5806efa29c4d2d1ce991e26eecae7c491a57c84e11d130371a4b4fce9d072490a9bac1dae6ec311e2f794f01f801fd93fd2bda2db163d7ecd65e7369b1d1fb2ba4b417f03f9963ff198b3a64ccb32ae3fbf491985f806b761613abd363df24b4b8f966c5a8fd6423b9c89b1e4754525645e2fc7c16e89842adeb744fb96a13d03479ad05ff56c2a3408e647aea8a9c7f87517375609aa168f85554f7d4c184da2bac69ec0a29be697d4c86b28df9e7e9e247f135f0442c0798e36e86253390d1f3b418648319b4298ea59b88d63ff53f67da02a48ea0c64721a678c4514a579f64eba2128bc44d11f6ed16b6e7f65bb1da5f9164634fa83843962276ac0c22457d6564bc9d1054cbc9f11ed61dcb55e163b364b5b44a53df992c";
const keyStr = "maggikhalo";

const [ivHex, cipherHex] = userProvidedData.split(':');
const iv = Buffer.from(ivHex, 'hex');
const cipherText = Buffer.from(cipherHex, 'hex');

const algos = ['aes-256-gcm', 'aes-128-gcm', 'aes-256-cbc', 'aes-128-cbc', 'aes-256-ctr'];
const hashing = [
    (k) => crypto.createHash('sha256').update(k).digest(),
    (k) => crypto.createHash('md5').update(k).digest(),
    (k) => Buffer.alloc(32, k),
    (k) => {
        const salt = 'salt'; // Common default
        return crypto.pbkdf2Sync(k, salt, 1000, 32, 'sha256');
    }
];

for (let a of algos) {
    for (let h of hashing) {
        try {
            const key = h(keyStr);
            if (a.includes('gcm')) {
                const tag = cipherText.subarray(cipherText.length - 16);
                const encrypted = cipherText.subarray(0, cipherText.length - 16);
                const decipher = crypto.createDecipheriv(a, key.subarray(0, a.includes('256')?32:16), iv);
                decipher.setAuthTag(tag);
                let dec = decipher.update(encrypted, undefined, 'utf8');
                dec += decipher.final('utf8');
                if (dec.includes('http')) {
                    console.log(`FOUND! Algo: ${a}, Hashing: ${h.toString().substring(0,30)}`);
                    console.log(`Payload: ${dec}`);
                }
            } else {
                const decipher = crypto.createDecipheriv(a, key.subarray(0, a.includes('256')?32:16), iv);
                let dec = decipher.update(cipherText, undefined, 'utf8');
                dec += decipher.final('utf8');
                if (dec.includes('http')) {
                    console.log(`FOUND! Algo: ${a}, Hashing: ${h.toString().substring(0,30)}`);
                    console.log(`Payload: ${dec}`);
                }
            }
        } catch(e) {}
    }
}
