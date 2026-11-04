// LINE webhook 簽章驗證與使用者 ID 雜湊

const enc = new TextEncoder();

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** x-line-signature = base64(HMAC-SHA256(channel secret, 原始 request body)) */
export async function verifySignature(body: string, signature: string | null, channelSecret: string): Promise<boolean> {
  if (!signature) return false;
  return timingSafeEqual(base64(await hmac(channelSecret, body)), signature);
}

/** 資料庫只存加鹽雜湊，不存 LINE userId 本身 */
export async function hashUserId(userId: string, salt: string): Promise<string> {
  return Array.from(await hmac(salt, userId), (b) => b.toString(16).padStart(2, "0")).join("");
}
