// 語音轉文字。目前接 OpenAI 的語音辨識；要換別家服務，只要改這個檔案。
// 沒有設定 OPENAI_API_KEY 時回傳 null：錄音照樣保存，交給志工聽。

const VOCABULARY =
  "花蓮縣光復鄉、鳳林鎮、萬榮鄉、馬太鞍、太巴塱、大全村、大進村、大馬村、大華村、大平村、" +
  "堰塞湖、淹水、泥巴、泥沙、房子、土地、道路、田、一樓";

export async function transcribe(bytes: Uint8Array<ArrayBuffer>, contentType: string): Promise<string | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), "voice.m4a");
  form.append("model", Deno.env.get("STT_MODEL") ?? "gpt-4o-transcribe");
  form.append("language", "zh");
  form.append("prompt", VOCABULARY); // 提示地名與常用詞，也讓輸出偏向繁體中文

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    console.error("語音辨識失敗", res.status, await res.text());
    return null;
  }
  const text = ((await res.json()) as { text?: string }).text?.trim();
  return text || null;
}
