import crypto from 'node:crypto';

const userProvidedData = "659996538566a34cb7e84323:6da59faf90e414278b02f0820a2dd6a7959220d36375a758076837aa87ceb5d1e02498728a87cadffb566031c482d68efb3acdbd7d59a35b162ab2b03bebbd59807837498fa0900e35997d21edc8bebe6933036701fb3498c890f5dc513165ef84c59d46ce4a50b749d8cfd6409e3ff17b6a3053919b03468853750e8141e64724f8f32767a7b5029eb9e2559643ceb32678f6c7fad92aea3b6d184ca468067d700757cc1845d54d0f47792b21a5d3eac368e1aab086e00cd039613e171138d589f1338ce12ca9daf648e7c9b8e51e479b5859d198b2e95f98684122d151187d582de034bb7bc68cf33a2f9ee00aca3ce26a167e831f2765cbb0450fdfb7b8b090dae7ca5a1eb81090a07904575e6abc3b6c6b5df0e44b5165bcff24da6a297d389da03e4426616b8cdd497938101023d50733fe88c44dcbc65a938d06e833c5a403802ddc467ee591ddcc314d5a99429e02abc5d637d05d2a85797fe4d800eab35f1e2b8fb1a96e235646b606f51e01133609a941d3d4910a5695fc3d9c19ed93e9eabd3ed49a16fb4cf359f6c6ec433c0773c9adcc3d5373114fcd853d9f2fc4bf1971db1f83767ee1abadac2e9bcfdae34344e745a72a58a6d573894f394fa63bdce4bcbae7e00b30c49c7cc7122cc4a5a4ddccf4936f8d024da7407e73a59a753aae08c8c54ee4c124ff72fdce9807366b9a1d19089ac69b3d9a2ef974d8a1e09f541e012a879510340d01ea3ac3f87774085ba37a2053c6cf12eda649929bb3d73fb9f2e84a0685e0d8e74f29e5d14ad32b957aeb1dd39d35f2af507978f8d2fc5219949e58eb713fd6e5cf4fb04386d6d9ce4f37e298b618417ddba14003f89690bc32836afeaa";
const password = "maggikhalo";

const [prefixHex, cipherHex] = userProvidedData.split(':');
const saltOrIv = Buffer.from(prefixHex, 'hex');
const cipherTextData = Buffer.from(cipherHex, 'hex');

const iters = [1, 100, 1000, 10000];
for (let iter of iters) {
    try {
        // Assume prefix is salt, derive Key and IV
        const keyAndIv = crypto.pbkdf2Sync(password, saltOrIv, iter, 32 + 12, 'sha256');
        const key = keyAndIv.subarray(0, 32);
        const derivedIv = keyAndIv.subarray(32, 32 + 12);
        const tag = cipherTextData.subarray(cipherTextData.length - 16);
        const encrypted = cipherTextData.subarray(0, cipherTextData.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, derivedIv);
        decipher.setAuthTag(tag);
        let dec = decipher.update(encrypted, undefined, 'utf8');
        dec += decipher.final('utf8');
        if (dec.includes('http')) {
            console.log(`FOUND! PBKDF2-Derived-IV | Iter: ${iter}`);
            console.log(dec);
        }
    } catch(e) {}
}

console.log("Finished explicit salt test.");
