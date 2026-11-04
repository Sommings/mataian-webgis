// LINE 災情回報機器人 webhook（Supabase Edge Function）
// 部署：supabase functions deploy line-webhook --no-verify-jwt
// 設定方式見 docs/line-bot.md

import type { SupabaseClient } from "@supabase/supabase-js";
import { geocode, loadAddressDb } from "./address.ts";
import { type Deps, handle, type Input, type Reply, type Session, wantsImage, wantsVoice } from "./conversation.ts";
import { extractFields } from "./extract.ts";
import { getContent, replyMessages } from "./line.ts";
import { hashUserId, verifySignature } from "./signature.ts";
import { insertReport, loadSession, makeClient, saveSession, uploadMedia } from "./store.ts";
import { transcribe } from "./transcribe.ts";

const CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET")!;
const ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const USER_HASH_SALT = Deno.env.get("LINE_USER_HASH_SALT")!;
const ADDRESS_DB_URL = Deno.env.get("ADDRESS_DB_URL") ?? "https://sommings.github.io/mataian-webgis/address_db.json";

/** 只列出這裡用到的 LINE webhook 事件欄位 */
interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  postback?: { data: string };
  message?: {
    id: string;
    type: string;
    text?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

async function toInput(ev: LineEvent, session: Session, db: SupabaseClient, userHash: string): Promise<Input> {
  if (ev.type === "follow") return { kind: "follow" };
  if (ev.type === "postback" && ev.postback) return { kind: "postback", data: ev.postback.data };
  if (ev.type !== "message" || !ev.message) return { kind: "unsupported" };

  const m = ev.message;
  switch (m.type) {
    case "text":
      return { kind: "text", text: m.text ?? "" };
    case "location":
      return { kind: "location", lat: m.latitude!, lng: m.longitude!, address: m.address };
    case "image": {
      if (!wantsImage(session)) return { kind: "unsupported" };
      const { bytes, contentType } = await getContent(ACCESS_TOKEN, m.id);
      return { kind: "image", path: await uploadMedia(db, userHash, m.id, bytes, contentType) };
    }
    case "audio": {
      if (!wantsVoice(session)) return { kind: "unsupported" };
      const { bytes, contentType } = await getContent(ACCESS_TOKEN, m.id);
      const path = await uploadMedia(db, userHash, m.id, bytes, contentType);
      const transcript = await transcribe(bytes, contentType);
      // 在「地點」這一步只需要逐字稿；在「補充說明」才整理欄位
      const extracted = transcript && session.step === "note" ? await extractFields(transcript) : null;
      return { kind: "voice", voice: { path, transcript, extracted } };
    }
    default:
      return { kind: "unsupported" };
  }
}

async function processEvent(ev: LineEvent, db: SupabaseClient, deps: Deps): Promise<void> {
  // 只處理一對一聊天；群組裡的訊息不回應
  if (ev.source?.type !== "user" || !ev.source.userId) return;
  const userHash = await hashUserId(ev.source.userId, USER_HASH_SALT);

  let replies: Reply[];
  try {
    const session = await loadSession(db, userHash);
    const input = await toInput(ev, session, db, userHash);
    const outcome = handle(session, input, deps);
    replies = outcome.replies;
    if (outcome.submit) {
      const id = await insertReport(db, userHash, outcome.submit);
      console.log("新的 LINE 回報", id);
    }
    await saveSession(db, userHash, outcome.session);
  } catch (err) {
    console.error("處理 LINE 事件失敗", err);
    replies = [{ text: "系統暫時忙不過來，請過幾分鐘再傳一次。不好意思！" }];
  }

  if (ev.replyToken && replies.length > 0) {
    await replyMessages(ACCESS_TOKEN, ev.replyToken, replies);
  }
}

async function processAll(events: LineEvent[]): Promise<void> {
  const db = makeClient();
  const addressDb = await loadAddressDb(ADDRESS_DB_URL).catch((err) => {
    console.error(err);
    return [];
  });
  const deps: Deps = { geocode: (text) => geocode(addressDb, text) };

  // 同一批事件依序處理，連續傳的多張照片才會照順序記錄
  for (const ev of events) {
    try {
      await processEvent(ev, db, deps);
    } catch (err) {
      console.error("回覆 LINE 失敗", err);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const body = await req.text();
  if (!(await verifySignature(body, req.headers.get("x-line-signature"), CHANNEL_SECRET))) {
    return new Response("invalid signature", { status: 401 });
  }

  const events: LineEvent[] = JSON.parse(body).events ?? [];
  // 先回 200 給 LINE，語音辨識等較慢的工作在背景完成
  const work = processAll(events);
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(work);
  else await work;

  return new Response("ok");
});
