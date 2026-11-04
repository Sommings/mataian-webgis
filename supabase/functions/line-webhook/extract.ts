// 用 Claude 從語音逐字稿整理出回報欄位。沒有設定 ANTHROPIC_API_KEY 時回傳 null。

import Anthropic from "@anthropic-ai/sdk";
import { DAMAGE_TYPES, type Extracted, HEIGHT_LEVELS } from "./conversation.ts";

const SCHEMA = {
  type: "object",
  properties: {
    damage_type: { type: "string", enum: [...DAMAGE_TYPES, "不確定"] },
    height_level: { type: "string", enum: [...HEIGHT_LEVELS, "不確定"] },
    place_description: { type: "string", description: "逐字稿裡提到的地點，沒提到就留空字串" },
    summary: { type: "string", description: "一句話的華語摘要，給審核志工看" },
  },
  required: ["damage_type", "height_level", "place_description", "summary"],
  additionalProperties: false,
};

const SYSTEM =
  "你負責整理花蓮縣光復鄉馬太鞍溪堰塞湖災區居民用 LINE 語音回報的災情。" +
  "輸入是語音辨識產生的逐字稿，說話的多半是長輩，可能有錯字、台語或阿美語詞彙的音譯。\n" +
  "只根據逐字稿的內容填欄位：沒提到或聽不出來就填「不確定」或空字串，不要猜。\n" +
  "damage_type：家裡、屋內、建物填「房子」；田、農地、空地填「土地」；路、橋填「道路」。\n" +
  "height_level：依說到的最高水位或泥沙高度對應。\n" +
  "summary 用一句簡短的繁體中文，寫給之後要回電確認的志工看。";

export function parseExtraction(text: string): Extracted | null {
  try {
    const v = JSON.parse(text);
    const damageOk = [...DAMAGE_TYPES, "不確定"].includes(v.damage_type);
    const heightOk = [...HEIGHT_LEVELS, "不確定"].includes(v.height_level);
    if (!damageOk || !heightOk || typeof v.place_description !== "string" || typeof v.summary !== "string") {
      return null;
    }
    return {
      damage_type: v.damage_type,
      height_level: v.height_level,
      place_description: v.place_description.trim(),
      summary: v.summary.trim(),
    };
  } catch {
    return null;
  }
}

export async function extractFields(transcript: string): Promise<Extracted | null> {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return null;
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-5-5",
      max_tokens: 16000,
      // 若請求被安全分類器拒絕，由伺服器自動改用建議的備援模型重跑
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: "user", content: transcript }],
    });

    if (response.stop_reason === "refusal") {
      console.error("欄位整理被拒絕", response.stop_details);
      return null;
    }
    const text = response.content.find((b) => b.type === "text");
    return text && text.type === "text" ? parseExtraction(text.text) : null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.error("Claude API 流量限制，稍後再試");
    else if (err instanceof Anthropic.APIError) console.error("Claude API 錯誤", err.status, err.message);
    else console.error("欄位整理失敗", err);
    return null;
  }
}
