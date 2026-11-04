// Supabase：對話進度、上傳檔案、寫入回報。使用 service role，只在 Edge Function 內執行。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Draft, newSession, type Session } from "./conversation.ts";

const BUCKET = "line_media";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function makeClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** 超過 24 小時沒動作的對話重新開始，但保留「已同意個資說明」 */
export async function loadSession(db: SupabaseClient, userHash: string): Promise<Session> {
  const { data, error } = await db.from("line_sessions").select("state, updated_at").eq("user_hash", userHash).maybeSingle();
  if (error) throw error;
  if (!data) return newSession();
  const state = data.state as Session;
  if (Date.now() - new Date(data.updated_at).getTime() > SESSION_TTL_MS) return newSession(state.consented);
  return state;
}

export async function saveSession(db: SupabaseClient, userHash: string, session: Session): Promise<void> {
  const { error } = await db.from("line_sessions").upsert({
    user_hash: userHash,
    state: session,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function uploadMedia(
  db: SupabaseClient,
  userHash: string,
  messageId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("png") ? "png" : contentType.includes("m4a") || contentType.includes("mp4") ? "m4a" : "bin";
  const path = `${userHash.slice(0, 16)}/${new Date().toISOString().slice(0, 10)}/${messageId}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function insertReport(db: SupabaseClient, userHash: string, d: Draft): Promise<string> {
  const { data, error } = await db
    .from("line_reports")
    .insert({
      user_hash: userHash,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      address_text: d.addressText ?? null,
      location_source: d.locationSource ?? "unresolved",
      photos: d.photos,
      damage_type: d.damageType ?? null,
      height_level: d.heightLevel ?? null,
      note_text: d.noteText ?? null,
      voice_path: d.voice?.path ?? null,
      voice_transcript: d.voice?.transcript ?? null,
      voice_extracted: d.voice?.extracted ?? null,
      voice_confirmed: d.voice?.confirmed ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
