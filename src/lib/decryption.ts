import CryptoJS from "crypto-js";
import * as pako from "pako";

// Helper functions for WordArray and Uint8Array conversions
export function uint8ArrayToWordArray(arr: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    words[i >>> 2] |= (arr[i] & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, arr.length);
}

export function wordArrayToUint8Array(wa: CryptoJS.lib.WordArray): Uint8Array {
  const sigBytes = wa.sigBytes;
  const words = wa.words;
  const arr = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    arr[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xFF;
  }
  return arr;
}

export function rot1_decode(s: string): string {
  if (!s) return "";
  let res = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 97 && code <= 122) {
      res += code > 97 ? String.fromCharCode(code - 1) : 'z';
    } else if (code >= 65 && code <= 90) {
      res += code > 65 ? String.fromCharCode(code - 1) : 'Z';
    } else {
      res += s[i];
    }
  }
  return res;
}

export function bytesToWordsLE(bytes: Uint8Array): number[] {
  const len = bytes.length;
  const outLen = (len + 3) >>> 2;
  const out = new Array(outLen).fill(0);
  for (let i = 0; i < len; i++) {
    out[i >>> 2] |= ((bytes[i] & 0xFF) << ((i & 3) << 3));
  }
  return out;
}

const DELTA = -0x0A2F61B3;

export function tZ_a(sum: number, y: number, z: number, p: number, e: number, k: number[]): number {
  const z_u = z >>> 0,
    y_u = y >>> 0;
  let v0 = ((z_u >>> 5) ^ ((y_u << 2) >>> 0)) >>> 0;
  let v1 = ((y_u >>> 3) ^ ((z_u << 4) >>> 0)) >>> 0;
  v0 = (v0 + v1) | 0;
  const part = (((sum ^ y) >>> 0) + ((k[(p & 3) ^ e] ^ z) >>> 0)) | 0;
  return (part ^ v0) | 0;
}

export function tZ_f(dataWordArray: CryptoJS.lib.WordArray, keyStr: string): CryptoJS.lib.WordArray | null {
  const sigBytes = dataWordArray.sigBytes;
  if (sigBytes === 0) return null;
  const words = dataWordArray.words;
  const rawBytes = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    rawBytes[i] = (words[i >>> 2] >>> (24 - (i & 3) * 8)) & 0xFF;
  }
  let v = bytesToWordsLE(rawBytes);
  const keyBytes = new TextEncoder().encode(keyStr);
  let key16 = new Uint8Array(16);
  key16.set(keyBytes.slice(0, 16));
  let k = bytesToWordsLE(key16);
  const n = v.length - 1;
  if (n < 1) return null;
  const rounds = 6 + Math.floor(52 / v.length);
  let sum = (rounds * DELTA) | 0;
  let y = v[0];
  while (sum !== 0) {
    const e = ((sum >>> 2) & 3);
    for (let p = n; p > 0; p--) {
      const z = v[p - 1];
      const mx = tZ_a(sum, y, z, p, e, k);
      v[p] = (v[p] - mx) | 0;
      y = v[p];
    }
    let z = v[n];
    let mx = tZ_a(sum, y, z, 0, e, k);
    v[0] = (v[0] - mx) | 0;
    y = v[0];
    sum = (sum - DELTA) | 0;
  }
  const total_bytes = v.length * 4;
  const m = v[v.length - 1];
  if (m < (total_bytes - 7) || m > (total_bytes - 4)) return null;
  const out = new Uint8Array(m);
  for (let i = 0; i < m; i++) {
    out[i] = (v[i >>> 2] >>> ((i & 3) * 8)) & 0xFF;
  }
  return uint8ArrayToWordArray(out);
}

export function tZ_g(b64_text: string, key_str: string): string | null {
  if (!b64_text) return null;
  const cleaned = b64_text.replace(/\s/g, '');
  let encrypted;
  try {
    encrypted = CryptoJS.enc.Base64.parse(cleaned);
  } catch (e) {
    return null;
  }
  const plain = tZ_f(encrypted, key_str);
  if (!plain) return null;
  try {
    return CryptoJS.enc.Utf8.stringify(plain);
  } catch (e) {
    return null;
  }
}

const CUSTOM_ALPHA_B64 = "Ojs8PT4/ISIjJCUmJygpKissLS4ve3x9fis9";
const ALPHA = typeof window !== "undefined" ? window.atob(CUSTOM_ALPHA_B64) : Buffer.from(CUSTOM_ALPHA_B64, 'base64').toString('binary');

export function wa_decrypt(key: string, encoded: string): string | null {
  try {
    const chars = encoded;
    const out_len = chars.length / 2;
    const mapped_bytes = new Uint8Array(out_len);
    for (let i = 0; i < out_len; i++) {
      const c1 = chars[2 * i],
        c2 = chars[2 * i + 1];
      const i1 = ALPHA.indexOf(c1),
        i2 = ALPHA.indexOf(c2);
      if (i1 === -1 || i2 === -1) return null;
      mapped_bytes[i] = ((i1 * 16) + i2) & 0xFF;
    }
    let latin1Str = '';
    for (let i = 0; i < mapped_bytes.length; i++) latin1Str += String.fromCharCode(mapped_bytes[i]);
    const cleanB64 = latin1Str.replace(/\s/g, '');
    const ciphertext = CryptoJS.enc.Base64.parse(cleanB64);
    const keyHex = CryptoJS.enc.Utf8.parse(key).toString(CryptoJS.enc.Hex).toUpperCase();
    const aesKey = CryptoJS.SHA256(keyHex);
    const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      aesKey,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    return CryptoJS.enc.Utf8.stringify(decrypted);
  } catch (e) {
    return null;
  }
}

export function Jl0_decrypt(encrypted_str: string, key_str: string): string | null {
  if (!encrypted_str) return null;
  try {
    const keyBytes = new TextEncoder().encode(key_str);
    let finalKey = new Uint8Array(16);
    if (keyBytes.length < 16) finalKey.set(keyBytes);
    else finalKey.set(keyBytes.slice(0, 16));
    const keyWA = uint8ArrayToWordArray(finalKey);
    const cleanB64 = encrypted_str.replace(/\s/g, '');
    const ciphertext = CryptoJS.enc.Base64.parse(cleanB64);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      keyWA,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return CryptoJS.enc.Utf8.stringify(decrypted);
  } catch (e) {
    return null;
  }
}

export function process_field(val: string, key: string, method: 'wa' | 'Jl0' | 'tZ'): string {
  if (!val) return "";
  let decrypted: string | null = null;
  if (method === "wa") decrypted = wa_decrypt(key, val);
  else if (method === "Jl0") decrypted = Jl0_decrypt(val, key);
  else if (method === "tZ") decrypted = tZ_g(val, key);
  if (decrypted === null || decrypted === undefined) decrypted = val;
  return rot1_decode(decrypted);
}

export function opensslDecrypt(encryptedBase64: string, password: string): string {
  const encryptedWA = CryptoJS.enc.Base64.parse(encryptedBase64);
  const bytes = wordArrayToUint8Array(encryptedWA);
  if (bytes.length < 16 ||
    bytes[0] !== 0x53 || bytes[1] !== 0x61 || bytes[2] !== 0x6c || bytes[3] !== 0x74 ||
    bytes[4] !== 0x65 || bytes[5] !== 0x64 || bytes[6] !== 0x5f || bytes[7] !== 0x5f) {
    throw new Error("Format OpenSSL non reconnu (salt manquant)");
  }
  const salt = bytes.slice(8, 16);
  const ciphertext = bytes.slice(16);

  const keyLen = 32,
    ivLen = 16;
  let derived = CryptoJS.lib.WordArray.create();
  let prev = CryptoJS.lib.WordArray.create();
  const pwWA = CryptoJS.enc.Utf8.parse(password);
  const saltWA = uint8ArrayToWordArray(salt);

  while (derived.sigBytes < keyLen + ivLen) {
    const input = prev.concat(pwWA).concat(saltWA);
    const hash = CryptoJS.MD5(input);
    derived = derived.concat(hash);
    prev = hash;
  }
  
  const keyWA = CryptoJS.lib.WordArray.create(derived.words.slice(0, keyLen / 4), keyLen);
  const ivWA = CryptoJS.lib.WordArray.create(derived.words.slice(keyLen / 4, (keyLen + ivLen) / 4), ivLen);

  const ciphertextWA = uint8ArrayToWordArray(ciphertext);
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertextWA } as any,
    keyWA,
    {
      iv: ivWA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  return CryptoJS.enc.Utf8.stringify(decrypted);
}

export function removeTrailingCommas(s: string): string {
  const out = [];
  let i = 0;
  const n = s.length;
  let inStr = false;
  let esc = false;
  let quote = '';
  while (i < n) {
    const ch = s[i];
    if (inStr) {
      out.push(ch);
      if (esc) esc = false;
      else {
        if (ch === '\\') esc = true;
        else if (ch === quote) {
          inStr = false;
          quote = '';
        }
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      out.push(ch);
      i++;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < n && s[j].match(/\s/)) j++;
      if (j < n && (s[j] === '}' || s[j] === ']')) {
        i++;
        continue;
      }
    }
    out.push(ch);
    i++;
  }
  return out.join('');
}

// EHI Mode Decryption Support
const EHI_L1_KEY = CryptoJS.enc.Hex.parse("7e1210f7aab956f7a668bda6e57feddb7f84ad840aef8d27b1b969959be3ab6c");
const EHI_BYPASS_IVS = [
  "221d572349555f1d112133236b1f4a3f",
  "5543494c53443e3f4a6a4539384e776a",
  "374c2541575e4d531a3c327b75431e5f"
];
const EHI_STANDARD_IVS = [
  "2c5d1147bbad422b3b334d4d235f1a53",
  "522b01433a5e8b2fc7549e1ad368e541",
  "337a1035aaedf3458ca167e92d74b839"
];

export function decryptEHI(rawText: string): any[] {
  const raw = rawText.trim();
  let payloadBytes;
  try {
    payloadBytes = CryptoJS.enc.Base64.parse(raw);
  } catch (e) {
    throw new Error("Contenu non base64");
  }
  const payload = wordArrayToUint8Array(payloadBytes);

  const allIVs = [...EHI_BYPASS_IVS, ...EHI_STANDARD_IVS];
  let lastError: any = null;
  for (const ivHex of allIVs) {
    try {
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: uint8ArrayToWordArray(payload) } as any,
        EHI_L1_KEY,
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      const plaintext = CryptoJS.enc.Utf8.stringify(decrypted);
      if (!plaintext) continue;
      const cleaned = removeTrailingCommas(plaintext);
      const obj = JSON.parse(cleaned);
      let servers = obj.Servers || obj.servers || (Array.isArray(obj) ? obj : null);
      if (!servers) {
        for (const key in obj) {
          if (Array.isArray(obj[key])) {
            servers = obj[key];
            break;
          }
        }
      }
      if (servers && servers.length) {
        return servers;
      }
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw new Error("Aucun IV n'a fonctionné : " + (lastError ? lastError.message : "inconnu"));
}

// DarkTunnel Mode Decryption Support
const DT_KEY_256 = CryptoJS.enc.Utf8.parse("$B&E)H@McQfThWmZq4t7w!z%C*F-JaNd");
const DT_KEY_192 = CryptoJS.enc.Utf8.parse("F)J@NcRfUjXn2r4u7x!A%D*G");
const DT_IV = CryptoJS.enc.Hex.parse("232e39185523184a5723586242200e05");

export function decryptDarkTunnel(rawText: string): any[] {
  const raw = rawText.trim();
  let outer: any;
  try {
    outer = JSON.parse(raw);
  } catch (e) {
    try {
      const decoded = CryptoJS.enc.Base64.parse(raw);
      const dec = CryptoJS.AES.decrypt(
        { ciphertext: decoded } as any,
        DT_KEY_256,
        {
          iv: DT_IV,
          mode: CryptoJS.mode.CFB,
          padding: CryptoJS.pad.NoPadding
        }
      );
      const plain = CryptoJS.enc.Utf8.stringify(dec);
      outer = JSON.parse(plain);
    } catch (e2) {
      throw new Error("Format non reconnu");
    }
  }
  if (!outer.encryptedLockedConfig) {
    throw new Error("Clé encryptedLockedConfig manquante");
  }
  const encrypted = outer.encryptedLockedConfig;
  const encryptedBytes = CryptoJS.enc.Base64.parse(encrypted);
  const decryptedOuter = CryptoJS.AES.decrypt(
    { ciphertext: encryptedBytes } as any,
    DT_KEY_256,
    {
      iv: DT_IV,
      mode: CryptoJS.mode.CFB,
      padding: CryptoJS.pad.NoPadding
    }
  );
  const plainOuter = CryptoJS.enc.Utf8.stringify(decryptedOuter);
  const obj = JSON.parse(plainOuter);
  if (obj.EncryptedLockedConfig) {
    const innerEnc = obj.EncryptedLockedConfig;
    const innerBytes = CryptoJS.enc.Base64.parse(innerEnc);
    const decryptedInner = CryptoJS.AES.decrypt(
      { ciphertext: innerBytes } as any,
      DT_KEY_192,
      {
        iv: DT_IV,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      }
    );
    const plainInner = CryptoJS.enc.Utf8.stringify(decryptedInner);
    const innerObj = JSON.parse(plainInner);
    obj.EncryptedLockedConfig = innerObj;
  }
  let servers = obj.Servers || obj.servers || (Array.isArray(obj) ? obj : null);
  if (!servers) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        servers = obj[key];
        break;
      }
    }
  }
  if (servers && servers.length) {
    return servers;
  }
  throw new Error("Aucun tableau de serveurs trouvé");
}

// NPVT (Whitebox) Decryption Support
const WHITEBOX_BLOB_B64 =
  "H4sIABrq9WkC/+y9dVhV6xb2PRGXiiKICBaC2C12ga3AmIoBomJgAAoqJoqCHegyMbEDbGzddnd3t5goBgYoxnePOSeLOfm254/3r/ecd+7rXNfah73iecb9u8e4n5VjDPOyCGYC/1Omy9wuc8vI/xMF0UzMIpqLWUWDmE3MLuYQLcScYi7RUswtWonWgXwdM1zLHNcy4FrZcS0LXCsXrpUb17IWraTr8H3wffF98H3xffB94T74vqTr8H3wffF98H3xffB94T74vqTrpK8jfV3KOtLXJV0nfR3p61LWkb4u6Trp60hfl7KO9HVJ10lfR/q6lHWkr0u6TqZ6ZK6XdJ1M9chcL+k6meqRuV7SdTLVI3O9pOtkqkfmeknXyVSPzPWSrpOpHpnrJV0nUz0y1yswUGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hnSGdIZ0hn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";

export function pickleLoad(data: Uint8Array): any {
  const dv = new DataView(data.buffer || data);
  let idx = 0;

  function readByte() {
    return dv.getUint8(idx++);
  }

  function readInt() {
    let b = readByte();
    let val = 0,
      shift = 0;
    while (b & 0x80) {
      val |= (b & 0x7f) << shift;
      shift += 7;
      b = readByte();
    }
    val |= b << shift;
    return val;
  }

  function readBytes(n: number) {
    const slice = new Uint8Array(data.buffer || data, idx, n);
    idx += n;
    return slice;
  }

  function decode(): any {
    const op = readByte();
    if (op === 0x28) { // MARK
      const items: any[] = [];
      while (true) {
        const next = data[idx];
        if (next === 0x74) { // TUPLE
          idx++; // skip 0x74
          const len = readInt();
          const tuple = [];
          for (let i = 0; i < len; i++) tuple.push(decode());
          return tuple;
        } else if (next === 0x5d) { // LIST
          idx++; // skip 0x5d
          const len = readInt();
          const list = [];
          for (let i = 0; i < len; i++) list.push(decode());
          return list;
        } else if (next === 0x65) { // EMPTY_DICT
          idx++;
          return {};
        } else if (next === 0x75) { // SETITEMS
          idx++;
          const dict: any = {};
          while (true) {
            const key = decode();
            if (key === null) break;
            const val = decode();
            dict[key] = val;
          }
          return dict;
        } else if (next === 0x4b) { // BININT1
          idx++;
          return dv.getUint8(idx++);
        } else if (next === 0x4d) { // BININT2
          idx++;
          return dv.getUint16(idx, true);
        } else if (next === 0x4e) { // NONE
          idx++;
          return null;
        } else if (next === 0x55) { // SHORT_BINBYTES
          idx++;
          const len = dv.getUint8(idx++);
          const bytes = readBytes(len);
          return bytes;
        } else if (next === 0x42) { // BINBYTES
          idx++;
          const len = readInt();
          const bytes = readBytes(len);
          return bytes;
        } else if (next === 0x43) { // SHORT_BINSTRING
          idx++;
          const len = dv.getUint8(idx++);
          const str = new TextDecoder().decode(readBytes(len));
          return str;
        } else if (next === 0x58) { // BINSTRING
          idx++;
          const len = readInt();
          const str = new TextDecoder().decode(readBytes(len));
          return str;
        } else if (next === 0x69) { // INT
          idx++;
          let s = '';
          while (true) {
            const c = readByte();
            if (c === 0x4a) break; // J
            if (c === 0x0a) break; // newline
            s += String.fromCharCode(c);
          }
          return parseInt(s, 10);
        } else if (next === 0x47) { // BININT
          idx++;
          return readInt();
        } else if (next === 0x30 || next === 0x31) { // etc.
          return null;
        } else {
          throw new Error('Unsupported pickle opcode: 0x' + next.toString(16) + ' at ' + idx);
        }
      }
    } else {
      throw new Error('Expected MARK (0x28) at start, got 0x' + op.toString(16));
    }
  }

  try {
    const result = decode();
    return result;
  } catch (e) {
    console.error('Pickle parse error:', e);
    return null;
  }
}

let WHITEBOX_P2: any = null;
let WHITEBOX_P3: any = null;
let WHITEBOX_P4: any = null;
let WHITEBOX_P5: any = null;
let whiteboxLoaded = false;

export function loadWhiteboxTables(): boolean {
  if (whiteboxLoaded) return true;
  try {
    const compressed = Uint8Array.from(atob(WHITEBOX_BLOB_B64), c => c.charCodeAt(0));
    const decompressed = pako.inflate(compressed);
    const tuple = pickleLoad(decompressed);
    if (!tuple || !Array.isArray(tuple) || tuple.length < 4) {
      console.error('Invalid whitebox tuple');
      return false;
    }
    WHITEBOX_P2 = tuple[0];
    WHITEBOX_P3 = tuple[1];
    WHITEBOX_P4 = tuple[2];
    WHITEBOX_P5 = tuple[3];
    whiteboxLoaded = true;
    return true;
  } catch (e) {
    console.error('Failed to load whitebox tables:', e);
    return false;
  }
}

export function decryptNPVT(b64Payload: string, p2: any, p3: any, p4: any, p5: any): string | null {
  console.warn("decryptNPVT: tables are incomplete, decryption is not supported in this build.");
  return null;
}

export function whiteboxDecryptNPVT(b64Payload: string): string | null {
  if (!whiteboxLoaded) {
    const success = loadWhiteboxTables();
    if (!success) {
      throw new Error("Échec chargement tables whitebox");
    }
  }
  return decryptNPVT(b64Payload, WHITEBOX_P2, WHITEBOX_P3, WHITEBOX_P4, WHITEBOX_P5);
}
