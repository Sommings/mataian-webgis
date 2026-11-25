# 故事地圖

「故事地圖」模式介紹馬太鞍溪流域 9 個區域的災害與土地課題。內容全部放在 [`src/data/storyRegions.json`](../src/data/storyRegions.json)，改文字、換照片、調位置都只要改這個檔案，不用動程式。

文案來自雲端資料夾「馬太鞍圖台storymap資料」的《馬太鞍溪_WebGIS各區域網站介紹文案》，照片清單來自同一個資料夾的「圖片+文字」。

## 每個區域的欄位

| 欄位 | 說明 |
|---|---|
| `id` | 英文代號，也是照片檔名的開頭 |
| `nameLocal`、`nameZh` | 族語名稱與中文名稱，地圖標籤族語在上、中文在下。沒有族語名稱填 `null` |
| `title` | 區域標題 |
| `lat`、`lng` | 標籤位置（WGS84） |
| `labelSide` | 標籤放在點的哪一側：`top`、`bottom`、`left`、`right`，用來避開相鄰區域 |
| `sections` | 段落，每段有 `heading`（例如「區域介紹」）與 `paragraphs` |
| `sources` | 文案依據的文件，顯示在「資料來源」 |
| `photos` | 照片，每張有 `caption`（圖說）、`src`、`credit`（來源） |
| `editorNote` | 給編輯者的備註，不會顯示在網站上 |

## 照片與引用

每張照片下方都會顯示圖說與「圖片來源」。引用媒體照片時，`credit` 填媒體名稱、報導標題與網址，網站會連回原始報導：

```json
"credit": { "name": "聯合新聞網", "title": "報導標題", "url": "https://..." }
```

媒體照片目前直接連到媒體網站的圖檔。**上線前仍需取得各媒體同意**，或換成團隊自己拍的照片；標註出處不等於取得授權。上下游新聞的圖檔會擋外站連結，網站上改顯示「請至原始報導查看」。

### 團隊照片：請放進 `public/story/photos/`

雲端上的 18 張團隊照片沒有公開分享，網站無法直接讀取。請下載後依下表檔名放進 `public/story/photos/`（建議長邊縮到 1600px、JPG 品質 80，每張 500KB 以內），網站就會自動顯示；還沒放的照片會顯示「照片待上傳」。

照片來源目前都暫填「政大國土服務團」，請確認實際拍攝者後修改 `credit.name`。

| 檔名 | 圖說 | 雲端檔案 |
|---|---|---|
| `matanki-1.jpg` | 明利村：空拍全貌 | [開啟](https://drive.google.com/file/d/1nCEmaaTFfDWqGZsgffDaiRJKfUmRMxaR/view) |
| `takomo-1.jpg` | 世耕地：空拍全貌 | [開啟](https://drive.google.com/file/d/1HUTsI5CJxUvD8WC7eMohgrF74a8zEY90/view) |
| `takomo-3.jpg` | 世耕地：雜草堆與遠方土砂暫置場 | [開啟](https://drive.google.com/file/d/10y2FC-NNqou1v7nZ55z4VoKlJy6vqhGC/view) |
| `jilitan-1.jpg` | 吉利潭：空拍全貌 | [開啟](https://drive.google.com/file/d/17YXYvBHy5CZ5QgmDCQJaBvJ-dLrOSxWW/view) |
| `xiangcaochang-1.jpg` | 香草場社區：空拍全貌 | [開啟](https://drive.google.com/file/d/1cWtrqs5tumsZpb9C6R6ZQI2dbUPINrXS/view) |
| `fataan-1.jpg` | 馬太鞍農業重災區：空拍全貌 | [開啟](https://drive.google.com/file/d/1WvBZ9Qr9DLZWINAfZ1aXfOvqMl94-uyD/view) |
| `fataan-2.jpg` | 馬太鞍農業重災區：留下的大量泥沙 | [開啟](https://drive.google.com/file/d/1Djn13Y8Np92L1LB6iTPjIuBZZIiq8-A_/view) |
| `fataan-3.jpg` | 馬太鞍農業重災區：被泥沙淹沒的原本農田 | [開啟](https://drive.google.com/file/d/16hczE2txgOzDaztg7_dULA2Sewli_cqU/view) |
| `tafalong-1.jpg` | 太巴塱部落：空拍全貌 | [開啟](https://drive.google.com/file/d/1DAMQnwBNw5qlx72Ksiygo_QRcu24m46D/view) |
| `tafalong-3.jpg` | 太巴塱部落：現況街景 | [開啟](https://drive.google.com/file/d/1Sip7G8kUolzoCTp2HnvxmNGPmPvp4nj7/view) |
| `atomo-1.jpg` | 阿陶莫部落：空拍全貌 | [開啟](https://drive.google.com/file/d/1A_RNTqjv6qBfsZvEHbRI3MzmyevrsSAp/view) |
| `atomo-2.jpg` | 阿陶莫部落：緊鄰的馬太鞍溪堤防 | [開啟](https://drive.google.com/file/d/1SlH4FcGc6ngePnhvf3yt2TiS4SF8JH4M/view) |
| `atomo-3.jpg` | 阿陶莫部落：民宅前堆放的土石堆 | [開啟](https://drive.google.com/file/d/1Up80J-EhnzI4S6VfRHqh1K_mgxjQUYE9/view) |
| `atomo-4.jpg` | 阿陶莫部落：泥沙遍布的原本農地 | [開啟](https://drive.google.com/file/d/1GAKOXiLaZpfSuatr8jpExaIhfO43PYjb/view) |
| `kalotongan-1.jpg` | 加里洞部落：空拍全貌 | [開啟](https://drive.google.com/file/d/1_Uz-_NG1cTUVrxjo3L09lwsh_z3v8ajp/view) |
| `kalotongan-2.jpg` | 加里洞部落：泥沙遍布的道路 | [開啟](https://drive.google.com/file/d/1vb2VXAIsPTeCgkGnDhN6tr6DUnDshKeA/view) |
| `kalotongan-3.jpg` | 加里洞部落：已接近橋梁高度的土石堆 | [開啟](https://drive.google.com/file/d/1aurVb_urbFBYAxSOT5xR-1Qeby32Plc5/view) |
| `kalotongan-4.jpg` | 加里洞部落：堤防工程加速進行中 | [開啟](https://drive.google.com/file/d/1WMKoJNYd-McfGtUP9W_2tkT_SXexfUdf/view) |

## 區域位置（待確認）

目前的位置是依 OpenStreetMap 的地名點位估計，請熟悉當地的組員確認後修改 `lat`、`lng`：

| 區域 | 位置依據 |
|---|---|
| 明利村 | OSM「明利」聚落點 |
| 世耕地 | 估計在馬太鞍溪北岸、台九線以東的農地中央 |
| 吉利潭 | OSM「吉利潭」 |
| 香草場社區 | OSM「香草場」 |
| 馬太鞍農業重災區 | 估計在馬太鞍部落與馬太鞍溪之間的農地 |
| 太巴塱部落 | OSM「太巴塱 Tafalong」 |
| 阿陶莫部落 | OSM「阿陶莫」 |
| 加里洞部落 | OSM「加里洞」 |
| 吉拉卡樣部落 | OSM 沒有這個部落，暫放在鳳林鎮「山興」聚落 |
