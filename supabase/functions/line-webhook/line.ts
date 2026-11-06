// LINE Messaging API：回覆訊息、下載使用者傳來的照片與語音

import type { QuickItem, Reply } from "./conversation.ts";

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

function quickReplyItem(item: QuickItem) {
  switch (item.kind) {
    case "postback":
      return { type: "action", action: { type: "postback", label: item.label, data: item.data, displayText: item.label } };
    case "location":
      return { type: "action", action: { type: "location", label: item.label } };
    case "camera":
      return { type: "action", action: { type: "camera", label: item.label } };
    case "cameraRoll":
      return { type: "action", action: { type: "cameraRoll", label: item.label } };
  }
}

export function toLineMessage(reply: Reply) {
  return {
    type: "text",
    text: reply.text,
    ...(reply.quickReply ? { quickReply: { items: reply.quickReply.map(quickReplyItem) } } : {}),
  };
}

export async function replyMessages(token: string, replyToken: string, replies: Reply[]): Promise<void> {
  // LINE 一次回覆最多 5 則
  const res = await fetch(`${API}/message/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: replies.slice(0, 5).map(toLineMessage) }),
  });
  if (!res.ok) throw new Error(`LINE reply 失敗：HTTP ${res.status} ${await res.text()}`);
}

/** 照片與語音要盡快下載，LINE 只保存一段時間 */
export async function getContent(token: string, messageId: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  const res = await fetch(`${DATA_API}/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LINE 內容下載失敗：HTTP ${res.status}`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
