# 花蓮馬太鞍溪堰塞湖災害參與式地圖

**網站：<https://sommings.github.io/mataian-webgis/>**

2025 年 9 月 23 日，馬太鞍溪堰塞湖溢流，花蓮縣光復鄉及周邊地區受災。當時沒有一套地圖工具，能把實際受災範圍、家戶現況、土地與建物資訊，以及災後復原需求整合在一起。

這個系統讓居民與相關單位用地圖記錄災情、整理空間資訊，作為後續災後重建、復原規劃與公共討論的基礎。資料也會用在空間盤點、部落與政府溝通，以及參與式 GIS 工作坊。

由[政大國土服務團](https://www.facebook.com/NCCULUPMCLUB/)開發與維護。

## 功能

### 一般災情填報
在地圖上選點後，填寫受災地點的土地與建物資訊：

- 基本資料：填表人、所屬部落、地址、地號、權屬、用途、是否為原住民保留地
- 土地受災：受災戶身分、泥砂高度、受災程度（1～3 級）
- 建物受災：建物型態、樓層數、居住人數、建材、建照與使照、淹水高度、泥砂堆積高度、受災程度（1～3 級）、受損面積（坪）
- 最多上傳 3 張現場照片
- 送出前須同意個資告知聲明

### 即時災情填報
回報道路中斷、積水、危險區域等需要提醒其他人注意的地點。可以標記單一點位，也可以在地圖上畫出多邊形的受災範圍。

### 地圖與圖層
- **地址搜尋**：先查本地門牌資料庫（光復鄉、鳳林鎮、萬榮鄉約 1.3 萬筆門牌點位），查不到再用 Google Geocoding API，最後才用 OpenStreetMap Nominatim。
- **定位**：用裝置定位跳到目前位置。
- **底圖與疊加圖層**：見下方「圖資來源」。

## 圖資來源

### 底圖

| 圖層 | 來源 | 說明 |
|---|---|---|
| 國土測繪圖資服務雲（電子地圖） | 內政部國土測繪中心 WMTS `EMAP` | 預設底圖 |
| 國土測繪圖資服務雲－正射影像 | 國土測繪中心 WMTS `PHOTO2` | 光復一帶為 2023 年影像（災前） |
| 最新衛星影像（Sentinel-2，10 m） | Copernicus Sentinel-2 L2A，經 Microsoft Planetary Computer 出圖磚 | 目前為 2026/10/01，日期寫在 `MapView.tsx` 的 `sentinel2Date`、`sentinel2Item` |
| 災後航照 2025/11/16 | 農業部林業及自然保育署航測及遙測分署拍攝，經國土測繪中心 WMTS 發布（`Asrs_20251116_1`～`_8`） | 只涵蓋馬太鞍溪流域 |
| 國土測繪圖資服務雲－114 年正射影像 | 國土測繪中心 WMTS `PHOTO2025` | 光復一帶為災前 |
| 國土測繪圖資服務雲－混合地圖 | 國土測繪中心 WMTS `EMAP5` | |
| 花蓮縣一般版地圖 | 花蓮縣政府 ArcGIS `HLMAP_3857` | |
| 花蓮縣正射影像（災前空照圖） | 花蓮縣政府 ArcGIS `HL_Image_3857` | 縣府圖磚 z14 以下是空白圖框，這幾層改用 114 年正射 |

各期影像的拍攝日期、涵蓋範圍與授權比較，見 [`docs/imagery-compare.html`](docs/imagery-compare.html)，直接用瀏覽器開啟這個檔案即可。

### 疊加圖層

| 圖層 | 資料 | 檔案 |
|---|---|---|
| 鄉鎮市區界、村里界、段籍圖－段界 | 國土測繪中心 WMTS `TOWN`、`Village`、`LANDSECT` | |
| 公有土地圖層 | 國土測繪中心 WMTS `LAND_OPENDATA` | |
| 原住民保留地（萬榮、鳳林、光復，113 年） | 113 年原住民保留地範圍圖 | `public/fataan_reserve.geojson` |
| 台糖公司可供釋出土地（花蓮縣） | 台糖花蓮縣土地 GeoPackage | `public/taisugar_hualien.geojson` |
| 花蓮縣公有土地（含屬性資料） | 花蓮縣國有土地 GeoPackage | `public/hualien_national_land.geojson` |
| 花蓮縣光復鄉地籍圖（107 年） | 花蓮縣光復地政事務所 | `public/cadastral_tiles/`（z13–18 自切圖磚） |
| 都市計畫土地使用分區圖 | 花蓮縣政府 ArcGIS `UP_ZONE_3857` | |

## 技術架構

- **前端**：React 19、TypeScript、Vite
- **地圖**：Leaflet 1.9、react-leaflet 5
- **後端**：[Supabase](https://supabase.com/)
  - 資料表 `reports`：災情填報（欄位對應 `src/types/report.ts`，以 snake_case 儲存，例如 `report_date`、`has_land_damage`、`building_damage_level`、`photos`）
  - 資料表 `messages`：留言板（`MessageBoard` 元件，目前沒有放在頁面上）
  - Storage bucket `disaster_photos`：填報時上傳的照片
- **部署**：GitHub Pages（`gh-pages` 分支）

## 本機開發

需要 Node.js 20.19 或 22.12 以上（Vite 8 的需求）。

```bash
npm ci
```

在專案根目錄建立 `.env`（已列在 `.gitignore`，不要 commit）：

```bash
VITE_SUPABASE_URL=你的 Supabase 專案網址
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
VITE_GOOGLE_MAPS_API_KEY=Google Maps Geocoding API 金鑰（可省略，省略時地址搜尋改用門牌資料庫與 Nominatim）
```

金鑰請向團隊負責人索取。Google Maps 金鑰會被打包進前端，請在 Google Cloud Console 限制只能從 `sommings.github.io` 與 `localhost` 使用。

啟動開發伺服器：

```bash
npm run dev
```

網站的 base path 是 `/mataian-webgis/`（見 `vite.config.ts`），所以本機網址是 <http://localhost:5173/mataian-webgis/>。

其他指令：

| 指令 | 用途 |
|---|---|
| `npm run build` | 型別檢查並建置到 `dist/` |
| `npm run lint` | ESLint 檢查 |
| `npm run preview` | 在本機預覽 `dist/` |
| `npm run deploy` | 建置並部署到 GitHub Pages |

## 部署

```bash
npm run deploy
```

這個指令會先執行 `npm run build`，再由 `deploy.js` 把 `dist/` 強制推到 `gh-pages` 分支，GitHub Pages 隨後自動更新。部署需要對這個 repo 有寫入權限。

部署的是**你本機目前的檔案**，不是 GitHub 上的 `main`。部署前請先把修改 commit 並推到 `main`，再從最新的 `main` 部署，這樣線上網站和程式碼才會一致。

## 資料處理腳本

`public/` 裡的 GeoJSON 與門牌資料庫，是用專案根目錄的 Python 腳本從原始資料轉出來的，座標從 TWD97（EPSG:3826）轉成 WGS84（EPSG:4326）。`public/cadastral_tiles/` 的切圖流程沒有放在 repo 裡。

| 腳本 | 輸入 | 輸出 |
|---|---|---|
| `build_address_db.py` | `public/三鄉 門牌點位.csv` | `public/address_db.json` |
| `process_shp.py` | `public/113年原住民保留地範圍圖/*.shp` | `public/fataan_reserve.geojson` |
| `process_cadastral_shp.py` | 107 年光復鄉地籍 shapefile | `public/hualien_guangfu_107.geojson` |
| `process_national_land_gpkg.py` | 花蓮縣國有土地 GeoPackage | `public/hualien_national_land.geojson` |
| `process_taisugar_gpkg.py` | 台糖花蓮縣土地 GeoPackage | `public/taisugar_hualien.geojson` |

需要的套件：`pyproj`、`pyshp`、`geopandas`。部分腳本把輸入檔路徑寫死在開發者電腦上，執行前請先改成自己的路徑。

## 專案結構

```
src/
  App.tsx               頁面切換（介紹頁、一般填報、即時填報）與填報送出
  components/
    LandingPage.tsx     專案介紹首頁與 FAQ
    MapView.tsx         地圖、圖層、地址搜尋、即時災情範圍繪製
    ReportForm.tsx      填報表單與照片上傳
    ConsentModal.tsx    個資告知聲明
    SuccessModal.tsx    送出成功畫面
  lib/supabase.ts       Supabase client
  types/report.ts       填報資料型別
public/                 GeoJSON、門牌資料庫、地籍圖磚
docs/                   影像對照頁
*.py                    圖資前處理腳本
deploy.js               GitHub Pages 部署腳本
```
