// 對話流程：純函式，不碰網路與資料庫，方便測試。
// 流程：同意個資 → 位置 → 照片 → 受災類型 → 淹水／泥沙高度 → 補充說明（文字或語音）→ 確認送出

export const MAX_PHOTOS = 3;

export const DAMAGE_TYPES = ["房子", "土地", "道路", "其他"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

// 前三段沿用網站表單的 HeightLevel 用語
export const HEIGHT_LEVELS = ["到腳踝", "到小腿", "到膝蓋", "到身體", "超過人", "沒有淹水", "不清楚"] as const;
export type HeightLevel = (typeof HEIGHT_LEVELS)[number];

export type Step =
  | "idle"
  | "consent"
  | "location"
  | "photos"
  | "damage"
  | "height"
  | "note"
  | "confirm_voice"
  | "confirm";

export type LocationSource = "line_location" | "address_db" | "village" | "unresolved";

export interface Extracted {
  damage_type: DamageType | "不確定";
  height_level: HeightLevel | "不確定";
  place_description: string;
  summary: string;
}

export interface VoiceResult {
  path: string;
  transcript: string | null;
  extracted: Extracted | null;
  confirmed?: boolean;
}

export interface Draft {
  lat?: number;
  lng?: number;
  addressText?: string;
  locationSource?: LocationSource;
  photos: string[];
  damageType?: DamageType;
  heightLevel?: HeightLevel;
  noteText?: string;
  voice?: VoiceResult;
}

export interface Session {
  step: Step;
  consented: boolean;
  draft: Draft;
}

export type Input =
  | { kind: "follow" }
  | { kind: "text"; text: string }
  | { kind: "location"; lat: number; lng: number; address?: string }
  | { kind: "image"; path: string }
  | { kind: "voice"; voice: VoiceResult }
  | { kind: "postback"; data: string }
  | { kind: "unsupported" };

export interface GeoMatch {
  lat: number;
  lng: number;
  matched: string;
  precision: "address" | "village";
}

export interface Deps {
  geocode(text: string): GeoMatch | null;
}

export type QuickItem =
  | { kind: "postback"; label: string; data: string }
  | { kind: "location"; label: string }
  | { kind: "camera"; label: string }
  | { kind: "cameraRoll"; label: string };

export interface Reply {
  text: string;
  quickReply?: QuickItem[];
}

export interface Outcome {
  session: Session;
  replies: Reply[];
  submit?: Draft;
}

export function newSession(consented = false): Session {
  return { step: "idle", consented, draft: { photos: [] } };
}

/** 這一步收到語音時才需要下載、轉文字，避免在其他步驟白花辨識費用 */
export function wantsVoice(session: Session): boolean {
  return session.step === "location" || session.step === "note";
}

/** 這一步收到照片時才需要下載 */
export function wantsImage(session: Session): boolean {
  return session.step === "photos" && session.draft.photos.length < MAX_PHOTOS;
}

const START_WORDS = ["回報災情", "回報", "開始", "我要回報"];
const CANCEL_WORDS = ["取消", "不要了"];
const SKIP_WORDS = ["略過", "跳過", "沒有", "不用"];
const DONE_WORDS = ["完成", "好了", "傳完了"];
const YES_WORDS = ["對", "是", "好", "同意", "送出", "正確"];

const q = {
  start: { kind: "postback", label: "回報災情", data: "action=start" } as QuickItem,
  cancel: { kind: "postback", label: "取消", data: "action=cancel" } as QuickItem,
};

function postback(label: string, data: string): QuickItem {
  return { kind: "postback", label, data };
}

function parsePostback(data: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(data));
}

function isOneOf(text: string, words: string[]): boolean {
  return words.includes(text.trim());
}

export function prompt(session: Session): Reply {
  switch (session.step) {
    case "consent":
      return {
        text:
          "回報之前，請先看這段說明：\n\n" +
          "您傳的位置、照片、語音和文字，只會給政大國土服務團做災情調查與重建規劃使用。" +
          "地圖上不會公開您的名字或 LINE 帳號。語音會用電腦先轉成文字，再由志工確認。\n\n" +
          "同意的話請按「同意」。",
        quickReply: [postback("同意", "consent=yes"), postback("不同意", "consent=no")],
      };
    case "location":
      return {
        text:
          "第 1 步：受災的地方在哪裡？\n\n" +
          "人在現場的話，請按下面的「傳送位置」。\n" +
          "不在現場，可以直接打地址或村名，或按住麥克風用說的。",
        quickReply: [{ kind: "location", label: "傳送位置" }, q.cancel],
      };
    case "photos":
      return {
        text: `第 2 步：請拍照或從相簿選照片，最多 ${MAX_PHOTOS} 張。\n沒有照片請按「略過」。`,
        quickReply: [
          { kind: "camera", label: "拍照" },
          { kind: "cameraRoll", label: "從相簿選" },
          postback("略過", "photos=done"),
          q.cancel,
        ],
      };
    case "damage":
      return {
        text: "第 3 步：哪裡受災？",
        quickReply: [...DAMAGE_TYPES.map((d) => postback(d, `damage=${d}`)), q.cancel],
      };
    case "height":
      return {
        text: "第 4 步：水或泥巴最高到哪裡？",
        quickReply: [...HEIGHT_LEVELS.map((h) => postback(h, `height=${h}`)), q.cancel],
      };
    case "note":
      return {
        text:
          "第 5 步：還有什麼想說的嗎？\n\n" +
          "可以打字，也可以按住麥克風用說的，例如「房子一樓都是泥巴，冰箱壞掉了」。\n" +
          "沒有的話請按「略過」。",
        quickReply: [postback("略過", "note=skip"), q.cancel],
      };
    case "confirm_voice":
      return voiceCheck(session.draft.voice!);
    case "confirm":
      return {
        text: `請確認您要回報的內容：\n\n${summarize(session.draft)}\n\n沒問題請按「送出」。`,
        quickReply: [postback("送出", "confirm=yes"), postback("重新填", "confirm=restart"), q.cancel],
      };
    case "idle":
      return { text: "要回報災情，請按下面的「回報災情」。", quickReply: [q.start] };
  }
}

function voiceCheck(voice: VoiceResult): Reply {
  const e = voice.extracted!;
  return {
    text:
      `我聽到的是：\n「${voice.transcript}」\n\n` +
      `整理起來是：\n` +
      `・受災：${e.damage_type}\n` +
      `・水或泥巴高度：${e.height_level}\n` +
      (e.place_description ? `・地點：${e.place_description}\n` : "") +
      `\n這樣對嗎？`,
    quickReply: [postback("對", "voice=yes"), postback("不對，重講", "voice=retry"), postback("略過", "voice=skip")],
  };
}

export function summarize(d: Draft): string {
  const place =
    d.locationSource === "line_location"
      ? `已收到定位${d.addressText ? `（${d.addressText}）` : ""}`
      : d.addressText ?? "未提供";
  const lines = [
    `・地點：${place}`,
    `・照片：${d.photos.length} 張`,
    `・受災：${d.damageType ?? "未選"}`,
  ];
  if (d.heightLevel) lines.push(`・水或泥巴高度：${d.heightLevel}`);
  if (d.noteText) lines.push(`・補充：${d.noteText}`);
  else if (d.voice) lines.push("・補充：已收到語音");
  return lines.join("\n");
}

function go(session: Session, step: Step, before: Reply[] = []): Outcome {
  const next = { ...session, step };
  return { session: next, replies: [...before, prompt(next)] };
}

/** 依目前步驟處理一個輸入，回傳新的對話狀態與要回覆的訊息 */
export function handle(session: Session, input: Input, deps: Deps): Outcome {
  const text = input.kind === "text" ? input.text.trim() : "";
  const pb = input.kind === "postback" ? parsePostback(input.data) : {};

  if (input.kind === "follow") {
    return {
      session: newSession(session.consented),
      replies: [{
        text:
          "您好，這裡是「花蓮馬太鞍溪堰塞湖災害參與式地圖」的回報帳號。\n\n" +
          "家裡、田地或道路有受災，按下面的「回報災情」，照著指示傳位置、照片，或直接用說的就可以。",
        quickReply: [q.start],
      }],
    };
  }

  if (pb.action === "cancel" || isOneOf(text, CANCEL_WORDS)) {
    return {
      session: newSession(session.consented),
      replies: [{ text: "已經取消了。之後要回報，再按「回報災情」就好。", quickReply: [q.start] }],
    };
  }

  if (pb.action === "start" || isOneOf(text, START_WORDS)) {
    const fresh = newSession(session.consented);
    return go(fresh, session.consented ? "location" : "consent");
  }

  const d = session.draft;

  switch (session.step) {
    case "idle":
      return { session, replies: [prompt(session)] };

    case "consent":
      if (pb.consent === "yes" || isOneOf(text, ["同意"])) {
        return go({ ...session, consented: true }, "location");
      }
      if (pb.consent === "no" || isOneOf(text, ["不同意"])) {
        return {
          session: newSession(false),
          replies: [{ text: "沒關係。如果需要協助，也可以請家人或村辦公室幫忙聯絡我們。", quickReply: [q.start] }],
        };
      }
      break;

    case "location": {
      if (input.kind === "location") {
        return go(
          { ...session, draft: { ...d, lat: input.lat, lng: input.lng, addressText: input.address, locationSource: "line_location" } },
          "photos",
          [{ text: "收到位置了，謝謝！" }],
        );
      }
      const spoken = input.kind === "voice" ? input.voice.transcript : null;
      const said = spoken ?? (input.kind === "text" ? text : "");
      if (said) {
        const hit = deps.geocode(said);
        if (hit) {
          return go(
            { ...session, draft: { ...d, lat: hit.lat, lng: hit.lng, addressText: said, locationSource: hit.precision === "address" ? "address_db" : "village" } },
            "photos",
            [{ text: hit.precision === "address" ? `找到了：${hit.matched}` : `先標在${hit.matched}，志工之後會再跟您確認詳細位置。` }],
          );
        }
        return go(
          { ...session, draft: { ...d, addressText: said, locationSource: "unresolved" } },
          "photos",
          [{ text: `記下來了：「${said}」。這個地址我找不到確切位置，志工之後會再跟您確認。` }],
        );
      }
      if (input.kind === "voice") {
        return { session, replies: [{ text: "語音我聽不太清楚，可以再說一次，或直接打地址嗎？" }, prompt(session)] };
      }
      break;
    }

    case "photos":
      if (input.kind === "image") {
        const photos = [...d.photos, input.path].slice(0, MAX_PHOTOS);
        const next = { ...session, draft: { ...d, photos } };
        if (photos.length >= MAX_PHOTOS) {
          return go(next, "damage", [{ text: `收到 ${MAX_PHOTOS} 張照片了，謝謝！` }]);
        }
        return {
          session: next,
          replies: [{
            text: `收到第 ${photos.length} 張照片。還有的話可以繼續傳，傳完請按「完成」。`,
            quickReply: [{ kind: "camera", label: "再拍一張" }, { kind: "cameraRoll", label: "從相簿選" }, postback("完成", "photos=done")],
          }],
        };
      }
      if (pb.photos === "done" || isOneOf(text, [...DONE_WORDS, ...SKIP_WORDS])) {
        return go(session, "damage");
      }
      break;

    case "damage": {
      const pick = (pb.damage ?? text) as DamageType;
      if (DAMAGE_TYPES.includes(pick)) {
        const next = { ...session, draft: { ...d, damageType: pick } };
        return go(next, pick === "房子" || pick === "土地" ? "height" : "note");
      }
      break;
    }

    case "height": {
      const pick = (pb.height ?? text) as HeightLevel;
      if (HEIGHT_LEVELS.includes(pick)) {
        return go({ ...session, draft: { ...d, heightLevel: pick } }, "note");
      }
      break;
    }

    case "note":
      if (input.kind === "voice") {
        const next = { ...session, draft: { ...d, voice: input.voice } };
        if (input.voice.transcript && input.voice.extracted) {
          return go(next, "confirm_voice");
        }
        return go(next, "confirm", [{ text: "收到您的語音了，志工會再仔細聽。" }]);
      }
      if (pb.note === "skip" || isOneOf(text, SKIP_WORDS)) {
        return go(session, "confirm");
      }
      if (input.kind === "text" && text) {
        return go({ ...session, draft: { ...d, noteText: text } }, "confirm");
      }
      break;

    case "confirm_voice": {
      const voice = d.voice!;
      if (pb.voice === "yes" || isOneOf(text, YES_WORDS)) {
        const e = voice.extracted!;
        // 按鈕選的優先；語音只補上還沒選的欄位
        const draft: Draft = {
          ...d,
          voice: { ...voice, confirmed: true },
          noteText: d.noteText ?? e.summary,
          damageType: d.damageType ?? (e.damage_type === "不確定" ? undefined : e.damage_type),
          heightLevel: d.heightLevel ?? (e.height_level === "不確定" ? undefined : e.height_level),
        };
        return go({ ...session, draft }, "confirm");
      }
      if (pb.voice === "retry" || isOneOf(text, ["不對", "重講"])) {
        return go({ ...session, draft: { ...d, voice: undefined } }, "note");
      }
      if (pb.voice === "skip" || isOneOf(text, SKIP_WORDS)) {
        // 錄音仍保留給志工聽，只是不採用自動整理的結果
        return go({ ...session, draft: { ...d, voice: { ...voice, confirmed: false } } }, "confirm");
      }
      break;
    }

    case "confirm":
      if (pb.confirm === "yes" || isOneOf(text, YES_WORDS)) {
        return {
          session: newSession(true),
          replies: [{
            text: "已經送出，謝謝您！志工確認後會放到災情地圖上。\n還有其他地方要回報，再按「回報災情」就好。",
            quickReply: [q.start],
          }],
          submit: d,
        };
      }
      if (pb.confirm === "restart" || isOneOf(text, ["重新填", "重來"])) {
        return go(newSession(true), "location");
      }
      break;
  }

  // 看不懂的輸入：再提示一次這一步要做什麼
  return { session, replies: [prompt(session)] };
}
