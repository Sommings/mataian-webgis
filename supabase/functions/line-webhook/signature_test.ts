import { equal, notEqual } from "node:assert/strict";
import { hashUserId, verifySignature } from "./signature.ts";

const secret = "test-channel-secret";
const body = JSON.stringify({ destination: "U0", events: [] });

async function sign(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...mac));
}

Deno.test("正確的簽章通過", async () => {
  equal(await verifySignature(body, await sign(body, secret), secret), true);
});

Deno.test("內容被改過、金鑰不對、沒有簽章都不通過", async () => {
  const sig = await sign(body, secret);
  equal(await verifySignature(body + " ", sig, secret), false);
  equal(await verifySignature(body, await sign(body, "other"), secret), false);
  equal(await verifySignature(body, null, secret), false);
});

Deno.test("使用者 ID 雜湊：同一人固定、換鹽就不同、不含原始 ID", async () => {
  const a = await hashUserId("U1234567890abcdef", "salt-a");
  equal(a, await hashUserId("U1234567890abcdef", "salt-a"));
  notEqual(a, await hashUserId("U1234567890abcdef", "salt-b"));
  equal(a.length, 64);
  equal(a.includes("U1234567890"), false);
});
