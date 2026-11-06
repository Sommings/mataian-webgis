# LINE 災情回報機器人

讓不方便填網頁表單的居民（特別是長輩），直接在團隊的 LINE 官方帳號裡回報災情：按按鈕、傳位置、拍照，也可以按住麥克風用說的。

目前是**原型**：回報會存進 Supabase 的 `line_reports`，等志工審核，還不會自動出現在網站地圖上。

## 長輩會看到的流程

1. 點圖文選單的「回報災情」
2. 第一次使用：看個資說明，按「同意」
3. **地點**：按「傳送位置」；不在現場就打地址、村名，或用說的
4. **照片**：拍照或從相簿選，最多 3 張，也可以略過
5. **哪裡受災**：房子／土地／道路／其他
6. **水或泥巴最高到哪裡**（房子、土地才問）：到腳踝／到小腿／到膝蓋／到身體／超過人／沒有淹水／不清楚
7. **補充說明**：打字、用說的，或略過。用說的會先轉成文字，請長輩按「對」確認
8. 看一次整理好的內容，按「送出」

任何時候說「取消」都會清空重來。24 小時沒動作，下次會從頭開始。

## 架構

```
LINE 官方帳號 ──webhook──▶ Supabase Edge Function：line-webhook
                              ├─ 驗證 LINE 簽章
                              ├─ 照片、語音 ──▶ Storage：line_media（私有）
                              ├─ 語音 ──▶ 語音辨識（OpenAI）──▶ 逐字稿
                              │          └─▶ Claude 整理成欄位
                              ├─ 地址 ──▶ 網站的門牌資料庫 address_db.json
                              └─ 回報 ──▶ 資料表：line_reports（待審核）
```

程式碼在 `supabase/functions/line-webhook/`：

| 檔案 | 內容 |
|---|---|
| `index.ts` | webhook 入口，串起下面各部分 |
| `conversation.ts` | 對話流程與回覆文字（要改問題或用語，改這裡） |
| `address.ts` | 地址、村名換成座標 |
| `transcribe.ts` | 語音轉文字（要換辨識服務，改這裡） |
| `extract.ts` | 用 Claude 從逐字稿整理受災類型、高度、地點 |
| `line.ts` | 呼叫 LINE API |
| `store.ts` | 讀寫 Supabase |
| `signature.ts` | LINE 簽章驗證、使用者 ID 雜湊 |

資料表與 bucket 定義在 `supabase/migrations/20261104000000_line_bot.sql`。

## 個資設計

- 資料庫**不存 LINE 使用者 ID**，只存加鹽雜湊，用來接續同一個人的對話。
- `line_reports`、`line_sessions` 開了 RLS 且沒有任何 policy，網站前端的 anon key 讀不到；照片與語音放在私有 bucket `line_media`。只有 Edge Function 和 Supabase 後台看得到。
- 語音會送到語音辨識服務、逐字稿會送到 Claude API 處理。對話一開始的個資說明已經寫明這點；若之後換服務，記得一起改 `conversation.ts` 裡的說明文字。
- 群組聊天室裡的訊息不處理，只回應一對一聊天。

## 安裝步驟

需要兩個人配合：**Supabase 專案（cujznupigqovpvvsnvyo）的管理者**，以及 **LINE 官方帳號的管理者**。

### 1. 準備金鑰

| 名稱 | 從哪裡拿 | 必要 |
|---|---|---|
| `LINE_CHANNEL_SECRET` | LINE Developers Console → 官方帳號的 Messaging API channel → Basic settings → Channel secret | 必要 |
| `LINE_CHANNEL_ACCESS_TOKEN` | 同一個 channel → Messaging API → Channel access token（long-lived）→ Issue | 必要 |
| `LINE_USER_HASH_SALT` | 自己產生一組亂數：`openssl rand -hex 32`。**設定後不要再改**，改了會接不上進行中的對話 | 必要 |
| `OPENAI_API_KEY` | OpenAI 後台。沒有設定時語音照樣保存，只是不會轉文字 | 選用 |
| `ANTHROPIC_API_KEY` | Claude Console。沒有設定時只保留逐字稿，不會自動整理欄位 | 選用 |
| `CLAUDE_MODEL` | 預設 `claude-opus-5-5` | 選用 |
| `STT_MODEL` | 預設 `gpt-4o-transcribe` | 選用 |

**金鑰不要貼在聊天室、不要 commit。** 在自己電腦建立 `supabase/.env.line`（`.gitignore` 已排除 `.env.*`）：

```bash
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_USER_HASH_SALT=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### 2. Supabase（由專案管理者執行）

安裝 [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) 並登入後，在專案根目錄：

```bash
supabase link --project-ref cujznupigqovpvvsnvyo
```

```bash
supabase db push
```

```bash
supabase secrets set --env-file supabase/.env.line
```

```bash
supabase functions deploy line-webhook --no-verify-jwt
```

`--no-verify-jwt` 一定要加：LINE 呼叫 webhook 時不會帶 Supabase 的 JWT，改由程式驗證 LINE 簽章。

### 3. LINE（由官方帳號管理者設定）

在 LINE Developers Console 的 Messaging API 設定：

1. Webhook URL 填 `https://cujznupigqovpvvsnvyo.supabase.co/functions/v1/line-webhook`
2. 打開「Use webhook」，按「Verify」，應該顯示 Success

在 LINE Official Account Manager：

1. 回應設定：打開 Webhook，**關閉「自動回應訊息」與「歡迎訊息」**（機器人會自己回覆，不關會重複）
2. 圖文選單：新增一個按鈕，動作選「文字」，內容填 `回報災情`

### 4. 用手機測一次

加官方帳號好友 → 點「回報災情」→ 跑完一次流程（傳位置、一張照片、選房子、到膝蓋、說一段話）→ 送出。到 Supabase 後台的 Table Editor 打開 `line_reports`，應該看到一筆 `pending`。

出錯時看 Supabase 後台 → Edge Functions → line-webhook → Logs。

## 審核

目前在 Supabase 後台處理：

1. Table Editor → `line_reports`，篩選 `review_status = pending`
2. 照片與錄音在 Storage → `line_media`，路徑記在 `photos`、`voice_path` 欄位
3. 確認後把 `review_status` 改成 `approved` 或 `rejected`，可在 `reviewer_note` 留註記

`location_source` 說明定位的可靠程度：`line_location`（手機定位）> `address_db`（門牌）> `village`（只知道村，標在村中心）> `unresolved`（需要回電確認）。

## 已知限制與下一步

- **審核通過的回報還不會上地圖。** 下一步可以做一個審核頁，通過後轉成 `reports` 的資料，或讓地圖另外顯示 `approved` 的 LINE 回報。
- **阿美語辨識不出來。** 主流語音辨識服務不支援阿美語，華語、部分台語可以。錄音一律保留，需要時由會族語的志工聽。
- 同一個人在一兩秒內連續傳很多則訊息時，少數情況下對話進度可能被覆蓋；照片在同一批送達時會依序處理。
- 語音只在「地點」與「補充說明」兩步處理，其他步驟傳語音會再提示一次該做什麼。

## 開發

需要 [Deno](https://deno.com/) 2。

```bash
cd supabase/functions/line-webhook && deno test --allow-read
```

```bash
cd supabase/functions/line-webhook && deno check index.ts && deno lint
```
