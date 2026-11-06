import { deepStrictEqual, equal, ok } from "node:assert/strict";
import {
  type Deps,
  type Extracted,
  handle,
  type Input,
  MAX_PHOTOS,
  newSession,
  prompt,
  type Session,
  type Step,
  wantsImage,
  wantsVoice,
} from "./conversation.ts";

const deps: Deps = {
  geocode: (text) =>
    text.includes("中山路一段50號")
      ? { lat: 23.645, lng: 121.416, matched: "花蓮縣光復鄉大全村中山路一段５０號", precision: "address" }
      : text.includes("大全村")
      ? { lat: 23.64, lng: 121.41, matched: "光復鄉大全村", precision: "village" }
      : null,
};

/** 依序送出輸入，回傳最後的結果與途中送出的回報 */
function run(inputs: Input[], start: Session = newSession()) {
  let session = start;
  let last!: ReturnType<typeof handle>;
  const submitted = [];
  for (const input of inputs) {
    last = handle(session, input, deps);
    session = last.session;
    if (last.submit) submitted.push(last.submit);
  }
  return { session, last, submitted };
}

const pb = (data: string): Input => ({ kind: "postback", data });
const text = (t: string): Input => ({ kind: "text", text: t });

Deno.test("第一次回報：同意 → 定位 → 兩張照片 → 房子 → 到膝蓋 → 打字補充 → 送出", () => {
  const { session, last, submitted } = run([
    pb("action=start"),
    pb("consent=yes"),
    { kind: "location", lat: 23.66, lng: 121.42, address: "花蓮縣光復鄉中正路" },
    { kind: "image", path: "u/a.jpg" },
    { kind: "image", path: "u/b.jpg" },
    pb("photos=done"),
    pb("damage=房子"),
    pb("height=到膝蓋"),
    text("一樓都是泥巴"),
    pb("confirm=yes"),
  ]);
  equal(submitted.length, 1);
  deepStrictEqual(submitted[0], {
    lat: 23.66,
    lng: 121.42,
    addressText: "花蓮縣光復鄉中正路",
    locationSource: "line_location",
    photos: ["u/a.jpg", "u/b.jpg"],
    damageType: "房子",
    heightLevel: "到膝蓋",
    noteText: "一樓都是泥巴",
  });
  equal(session.step, "idle");
  equal(session.consented, true, "送出後保留同意狀態，下次不用再按同意");
  ok(last.replies[0].text.includes("已經送出"));
});

Deno.test("已同意過的人直接從地點開始", () => {
  const { session } = run([text("回報災情")], newSession(true));
  equal(session.step, "location");
});

Deno.test("不同意個資說明就結束，不會往下問", () => {
  const { session, submitted } = run([pb("action=start"), pb("consent=no")]);
  equal(session.step, "idle");
  equal(session.consented, false);
  equal(submitted.length, 0);
});

Deno.test("打地址：找到門牌、只到村、完全找不到三種情況", () => {
  const at = (s: Step): Session => ({ ...newSession(true), step: s });
  const exact = handle(at("location"), text("中山路一段50號"), deps);
  equal(exact.session.draft.locationSource, "address_db");
  equal(exact.session.step, "photos");

  const village = handle(at("location"), text("大全村那邊"), deps);
  equal(village.session.draft.locationSource, "village");

  const unknown = handle(at("location"), text("阿嬤家後面的田"), deps);
  equal(unknown.session.draft.locationSource, "unresolved");
  equal(unknown.session.draft.addressText, "阿嬤家後面的田");
  equal(unknown.session.step, "photos", "找不到也繼續，交給志工確認");
});

Deno.test("用說的講地址：用逐字稿查位置", () => {
  const out = handle({ ...newSession(true), step: "location" }, {
    kind: "voice",
    voice: { path: "u/v.m4a", transcript: "我家在大全村", extracted: null },
  }, deps);
  equal(out.session.draft.locationSource, "village");
});

Deno.test(`照片收滿 ${MAX_PHOTOS} 張自動進下一步`, () => {
  let s: Session = { ...newSession(true), step: "photos" };
  for (let i = 0; i < MAX_PHOTOS; i++) s = handle(s, { kind: "image", path: `u/${i}.jpg` }, deps).session;
  equal(s.step, "damage");
  equal(s.draft.photos.length, MAX_PHOTOS);
  equal(wantsImage(s), false);
});

Deno.test("道路、其他不問淹水高度", () => {
  const out = handle({ ...newSession(true), step: "damage" }, pb("damage=道路"), deps);
  equal(out.session.step, "note");
});

const extracted: Extracted = { damage_type: "房子", height_level: "到小腿", place_description: "大全村", summary: "一樓淹到小腿" };

Deno.test("語音補充：確認後只補上還沒選的欄位，按鈕選的優先", () => {
  const start: Session = { ...newSession(true), step: "note", draft: { photos: [], damageType: "土地" } };
  const heard = handle(start, { kind: "voice", voice: { path: "u/v.m4a", transcript: "水淹到小腿", extracted } }, deps);
  equal(heard.session.step, "confirm_voice");
  ok(heard.replies[0].text.includes("水淹到小腿"));

  const ok1 = handle(heard.session, pb("voice=yes"), deps);
  equal(ok1.session.step, "confirm");
  equal(ok1.session.draft.damageType, "土地", "長輩按的按鈕不被語音覆蓋");
  equal(ok1.session.draft.heightLevel, "到小腿", "沒選過的高度由語音補上");
  equal(ok1.session.draft.noteText, "一樓淹到小腿");
  equal(ok1.session.draft.voice?.confirmed, true);
});

Deno.test("語音重講會回到補充說明；略過仍保留錄音", () => {
  const s: Session = {
    ...newSession(true),
    step: "confirm_voice",
    draft: { photos: [], voice: { path: "u/v.m4a", transcript: "…", extracted } },
  };
  const retry = handle(s, pb("voice=retry"), deps);
  equal(retry.session.step, "note");
  equal(retry.session.draft.voice, undefined);

  const skip = handle(s, pb("voice=skip"), deps);
  equal(skip.session.step, "confirm");
  equal(skip.session.draft.voice?.path, "u/v.m4a");
  equal(skip.session.draft.voice?.confirmed, false);
});

Deno.test("沒有辨識服務時：收下錄音直接進確認", () => {
  const out = handle({ ...newSession(true), step: "note" }, {
    kind: "voice",
    voice: { path: "u/v.m4a", transcript: null, extracted: null },
  }, deps);
  equal(out.session.step, "confirm");
  ok(out.replies[0].text.includes("志工會再仔細聽"));
});

Deno.test("任何一步說取消都會清空，但保留同意狀態", () => {
  const s: Session = { ...newSession(true), step: "height", draft: { photos: ["u/a.jpg"], damageType: "房子" } };
  const out = handle(s, text("取消"), deps);
  deepStrictEqual(out.session, newSession(true));
});

Deno.test("看不懂的輸入：留在原步驟並再提示一次", () => {
  const s: Session = { ...newSession(true), step: "damage" };
  const out = handle(s, { kind: "unsupported" }, deps);
  equal(out.session.step, "damage");
  equal(out.replies[0].text, prompt(s).text);
});

Deno.test("只在地點與補充說明兩步處理語音", () => {
  const steps: Step[] = ["idle", "consent", "location", "photos", "damage", "height", "note", "confirm"];
  deepStrictEqual(steps.filter((step) => wantsVoice({ ...newSession(true), step })), ["location", "note"]);
});

Deno.test("每一步的快速回覆都符合 LINE 限制（最多 13 個、標籤 20 字內）", () => {
  const steps: Step[] = ["idle", "consent", "location", "photos", "damage", "height", "note", "confirm"];
  for (const step of steps) {
    const r = prompt({ ...newSession(true), step });
    ok((r.quickReply?.length ?? 0) <= 13, step);
    for (const item of r.quickReply ?? []) ok(item.label.length <= 20, `${step}: ${item.label}`);
    ok(r.text.length <= 5000, step);
  }
});
