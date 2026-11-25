import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  GeoJSON,
  FeatureGroup,
  Polygon,      // 引入 Polygon 元件
  CircleMarker, // 引入 CircleMarker 元件
  LayerGroup,   // 引入 LayerGroup 元件（組合多個條帶圖層）
  ScaleControl,
} from "react-leaflet";
import type { Report } from "../types/report";
import type { FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type PathOptions } from "leaflet";
import { Trash2, Search } from "lucide-react";
import { MapToolbar, MeasureLayer, type MeasureKind } from "./MapTools";
import { GUANGFU_BOUNDS } from "../lib/guangfu";
import LayerPanel, { type LayerOption, type OverlayState } from "./LayerPanel";
import { StoryLayer, type OpenPhoto } from "./StoryMap";
import type { StoryRegion } from "../types/story";

const normalizeAddress = (addr: string) => {
  return addr
    .replace(/臺/g, "台")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, "");
};

const parsePolygonFromAddress = (address: string): [number, number][] | null => {
  if (!address) return null;
  const match = address.match(/災害範圍 \(多邊形點位\): (\[\[.*?\]\])/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("解析多邊形點位失敗:", e);
      return null;
    }
  }
  return null;
};

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type MapViewProps = {
  reports: Report[];
  selectedLocation: SelectedLocation;
  onSelectLocation: (location: { lat: number; lng: number }) => void;
  /** 地點回報：按下地圖上的「確認點位」 */
  onConfirmGeneralLocation?: () => void;
  lastSubmittedLocation?: SelectedLocation;
  // query：只瀏覽，點地圖不選點；point：地點回報（點選位置）；area：範圍回報（圈選多邊形）
  mapMode: 'query' | 'point' | 'area';
  /** 範圍回報：按下地圖上的「確認範圍」 */
  onPolygonConfirm?: (polygonPoints: [number, number][]) => void;
  /** 範圍回報已確認的多邊形，顯示在地圖上 */
  confirmedPolygon?: [number, number][];
  /** 標記位置時按「取消」，回到選擇地點或範圍 */
  onCancelDraw?: () => void;
  /** 填報表單打開時不顯示地圖上方的操作提示（會被表單擋住） */
  hideDrawHint?: boolean;
  /** 範圍回報按「重畫」：清掉已確認的範圍 */
  onClearPolygon?: () => void;
  /** 是否顯示已回報的災情點位與範圍（只在回報災情模式顯示） */
  showReports: boolean;
  /** 故事地圖模式：顯示區域標籤 */
  story?: {
    regions: StoryRegion[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onOpenPhoto: OpenPhoto;
  } | null;
};

const createCustomIcon = (type: "default" | "pulse" | "bounce") => {
  let extraClass = "";
  if (type === "pulse") extraClass = " custom-map-pin-pulse";
  if (type === "bounce") extraClass = " custom-map-pin-bounce";
  if (type === "default") extraClass = " custom-map-pin-default";

  return new L.DivIcon({
    className: "custom-map-pin-wrapper",
    html: `<div class="custom-map-pin${extraClass}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const bounceIcon = createCustomIcon("bounce");

// 回報時在地圖上點的「確認點位」「確認範圍」按鈕
const confirmIcon = (label: string, className: string) =>
  new L.DivIcon({
    className: "draw-confirm-marker",
    html: `<span class="draw-confirm ${className}">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
const confirmPointIcon = confirmIcon("確認點位", "above-pin");
const confirmAreaIcon = confirmIcon("確認範圍", "beside-vertex");

const isInstantReport = (report: Report) => report.address.startsWith("[🚨即時災情]");
const pulseIcon = createCustomIcon("pulse");
const defaultIcon = createCustomIcon("default");

const nlscTileUrl = (layer: string) =>
  `https://wmts.nlsc.gov.tw/wmts/${layer}/default/GoogleMapsCompatible/{z}/{y}/{x}`;

// 航遙測分署 2025/11/16 災後航照（經國土測繪中心 WMTS 發布），整期拆成 8 個條帶圖層
const postDisasterAerialUrls = Array.from({ length: 8 }, (_, i) =>
  nlscTileUrl(`Asrs_20251116_${i + 1}`)
);

// Sentinel-2 L2A（10 m），由 Microsoft Planetary Computer 出圖磚。
// 換日期時改成新的 item id（STAC 查 collection sentinel-2-l2a、圖幅 T51QUG）
const sentinel2TileUrl = (item: string) =>
  "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png" +
  `?collection=sentinel-2-l2a&item=${item}&assets=visual&asset_bidx=visual%7C1%2C2%2C3&nodata=0`;

const SENTINEL2_SCENES: Record<string, { date: string; item: string }> = {
  s2pre0615: { date: "2025/06/15", item: "S2A_MSIL2A_20250615T023141_R046_T51QUG_20250615T070417" },
  s2pre0921: { date: "2025/09/21", item: "S2C_MSIL2A_20250921T022541_R046_T51QUG_20250921T054914" },
  sentinel2: { date: "2026/10/01", item: "S2B_MSIL2A_20261001T022529_R046_T51QUG_20261001T043628" },
};

// 圖層面板的清單。基本底圖擇一，依「地圖／災前影像／災後影像」分組；額外圖層可多選，各自調透明度
// 災前、災後以 2025/9/23 馬太鞍溪堰塞湖溢流為界
const BASE_LAYERS: LayerOption[] = [
  { id: "emap", name: "國土測繪圖資服務雲 (電子地圖)", group: "map" },
  { id: "emap5", name: "國土測繪圖資服務雲-混合地圖", group: "map" },
  { id: "hlmap", name: "花蓮縣一般版地圖", group: "map" },
  { id: "s2pre0921", name: "衛星影像 2025/09/21，溢流前兩天 (Sentinel-2)", group: "pre" },
  { id: "s2pre0615", name: "衛星影像 2025/06/15 (Sentinel-2)", group: "pre" },
  { id: "photo2", name: "國土測繪中心正射影像 (光復一帶為 2023 年)", group: "pre" },
  { id: "photo2025", name: "國土測繪中心 114 年正射影像", group: "pre" },
  { id: "hlimage", name: "花蓮縣正射影像 (空照圖)", group: "pre" },
  { id: "sentinel2", name: "衛星影像 2026/10/01 (Sentinel-2)", group: "post" },
  { id: "aerial20251116", name: "航照 2025/11/16 (航遙測分署，只涵蓋馬太鞍溪流域)", group: "post" },
];

const OVERLAYS: (LayerOption & { on: boolean })[] = [
  { id: "guangfu", name: "光復鄉界", on: false, legend: { color: "#000000", dashed: true } },
  { id: "town", name: "鄉鎮市區界 (國土測繪服務雲)", on: false },
  { id: "village", name: "村里界 (國土測繪服務雲)", on: false },
  { id: "landsect", name: "段籍圖-段界 (國土測繪服務雲)", on: false },
  { id: "dikeLand", name: "堤防用地範圍線", on: true, legend: { color: "#ef4444", fill: "rgba(239, 68, 68, 0.2)" } },
  { id: "governance", name: "治理計畫線", on: true, legend: { color: "#f59e0b" } },
  { id: "backwater", name: "背水堤範圍", on: true, legend: { color: "#06b6d4", fill: "rgba(6, 182, 212, 0.25)" } },
  { id: "reserve", name: "原住民保留地(萬榮.鳳林.光復)(113年資料)", on: false, legend: { color: "#d97706", fill: "rgba(245, 158, 11, 0.8)" } },
  { id: "taisugar", name: "台糖公司可供釋出土地 (花蓮縣)", on: false, legend: { color: "#059669", fill: "rgba(16, 185, 129, 0.5)" } },
  { id: "nationalLand", name: "花蓮縣公有土地(含屬性資料)", on: false, legend: { color: "#1d4ed8", fill: "rgba(59, 130, 246, 0.4)" } },
  { id: "cadastral", name: "花蓮縣光復鄉地籍圖(107年資料)", on: false },
  { id: "landOpendata", name: "公有土地圖層 (國土測繪服務雲)", on: false },
  { id: "upZone", name: "都市計畫土地使用分區圖", on: false },
];

const INITIAL_OVERLAY_STATE: OverlayState = Object.fromEntries(
  OVERLAYS.map((o) => [o.id, { on: o.on, transparency: 0 }])
);

// 向量圖層原本的樣式；透明度拉桿會等比例調整線與填色的不透明度
const GUANGFU_STYLE: PathOptions = { color: "#000000", weight: 2.5, dashArray: "8 6", fill: false, opacity: 1 };
const DIKE_LAND_STYLE: PathOptions = { color: "#ef4444", weight: 3, opacity: 0.9, fillColor: "#ef4444", fillOpacity: 0.2 };
const GOVERNANCE_STYLE: PathOptions = { color: "#f59e0b", weight: 3, opacity: 0.95 };
const BACKWATER_STYLE: PathOptions = { color: "#06b6d4", weight: 3, opacity: 0.9, fillColor: "#06b6d4", fillOpacity: 0.25 };
const RESERVE_STYLE: PathOptions = { color: "#d97706", weight: 2, opacity: 0.8, fillColor: "#f59e0b", fillOpacity: 0.8 };
const TAISUGAR_STYLE: PathOptions = { color: "#059669", weight: 2, opacity: 0.85, fillColor: "#10b981", fillOpacity: 0.5 };
const NATIONAL_LAND_STYLE: PathOptions = { color: "#1d4ed8", weight: 1.5, opacity: 0.85, fillColor: "#3b82f6", fillOpacity: 0.4 };

// 只在該圖層的透明度改變時產生新樣式，避免大型 GeoJSON 每次重繪都重新套樣式
function usePathStyle(base: PathOptions, factor: number): PathOptions {
  return useMemo(
    () => ({
      ...base,
      opacity: (base.opacity ?? 1) * factor,
      fillOpacity: (base.fillOpacity ?? 0.2) * factor,
    }),
    [base, factor]
  );
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function FlyToUpdater({ location }: { location?: SelectedLocation }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 16, { duration: 2 });
    }
  }, [location, map]);
  return null;
}

// 回報時的地圖點選：地點回報選一個點，範圍回報逐一加入多邊形頂點
function LocationPicker({
  onSelectLocation,
  mapMode,
  onAddDrawingPoint,
}: {
  onSelectLocation: (location: { lat: number; lng: number }) => void;
  mapMode: 'query' | 'point' | 'area';
  onAddDrawingPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      if (mapMode === 'point') onSelectLocation({ lat, lng });
      if (mapMode === 'area') onAddDrawingPoint(lat, lng);
    },
  });

  return null;
}

function PopupRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <p style={{ margin: "0 0 6px 0", lineHeight: 1.45 }}>
      <strong>{label}</strong>
      {value ?? "未填"}
    </p>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details
      style={{
        marginTop: "10px",
        paddingTop: "10px",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 700,
          color: "#334155",
          marginBottom: "8px",
        }}
      >
        {title}
      </summary>
      <div style={{ marginTop: "8px" }}>{children}</div>
    </details>
  );
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function MapView({
  reports,
  selectedLocation,
  onSelectLocation,
  onConfirmGeneralLocation,
  lastSubmittedLocation,
  mapMode,
  onPolygonConfirm,
  confirmedPolygon = [],
  onCancelDraw,
  onClearPolygon,
  hideDrawHint = false,
  showReports,
  story,
}: MapViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [reserveGeojson, setReserveGeojson] = useState<any>(null);
  const [taiSugarGeojson, setTaiSugarGeojson] = useState<any>(null);
  const [addressDb, setAddressDb] = useState<{ a: string, x: number, y: number }[]>([]);
  const [lightboxData, setLightboxData] = useState<{ photos: string[]; index: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [nationalLandGeojson, setNationalLandGeojson] = useState<any>(null);
  const [isNationalLandLoading, setIsNationalLandLoading] = useState(false);
  const [dikeLandLineGeojson, setDikeLandLineGeojson] = useState<FeatureCollection | null>(null);
  const [governanceLineGeojson, setGovernanceLineGeojson] = useState<FeatureCollection | null>(null);
  const [backwaterDikeGeojson, setBackwaterDikeGeojson] = useState<FeatureCollection | null>(null);
  const [guangfuGeojson, setGuangfuGeojson] = useState<FeatureCollection | null>(null);

  // 右側工具列：圖層面板開關與測量
  const [map, setMap] = useState<L.Map | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [activeBase, setActiveBase] = useState(BASE_LAYERS[0].id);
  const [overlayState, setOverlayState] = useState<OverlayState>(INITIAL_OVERLAY_STATE);
  const isOn = (id: string) => overlayState[id].on;
  // 透明度 0% = 完全不透明
  const opacityOf = (id: string) => 1 - overlayState[id].transparency / 100;
  const cadastralEnabled = isOn("cadastral");
  const nationalLandEnabled = isOn("nationalLand");

  const guangfuStyle = usePathStyle(GUANGFU_STYLE, opacityOf("guangfu"));
  const dikeLandStyle = usePathStyle(DIKE_LAND_STYLE, opacityOf("dikeLand"));
  const governanceStyle = usePathStyle(GOVERNANCE_STYLE, opacityOf("governance"));
  const backwaterStyle = usePathStyle(BACKWATER_STYLE, opacityOf("backwater"));
  const reserveStyle = usePathStyle(RESERVE_STYLE, opacityOf("reserve"));
  const taiSugarStyle = usePathStyle(TAISUGAR_STYLE, opacityOf("taisugar"));
  const nationalLandStyle = usePathStyle(NATIONAL_LAND_STYLE, opacityOf("nationalLand"));
  const [measureKind, setMeasureKind] = useState<MeasureKind | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureDone, setMeasureDone] = useState(false);

  // PPGIS 多邊形災害範圍繪製 State
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fataan_reserve.geojson`)
      .then((res) => res.json())
      .then((data) => setReserveGeojson(data))
      .catch((err) => console.error("無法載入原住民保留地 GeoJSON:", err));

    fetch(`${import.meta.env.BASE_URL}taisugar_hualien.geojson`)
      .then((res) => res.json())
      .then((data) => setTaiSugarGeojson(data))
      .catch((err) => console.error("無法載入台糖土地 GeoJSON:", err));

    fetch(`${import.meta.env.BASE_URL}address_db.json`)
      .then((res) => res.json())
      .then((data) => setAddressDb(data))
      .catch((err) => console.error("載入本地門牌資料庫失敗：", err));

    fetch(`${import.meta.env.BASE_URL}堤防用地範圍線.json`)
      .then((res) => res.json())
      .then((data) => setDikeLandLineGeojson(data))
      .catch((err) => console.error("無法載入堤防用地範圍線 JSON:", err));

    fetch(`${import.meta.env.BASE_URL}治理計畫線.json`)
      .then((res) => res.json())
      .then((data) => setGovernanceLineGeojson(data))
      .catch((err) => console.error("無法載入治理計畫線 JSON:", err));

    fetch(`${import.meta.env.BASE_URL}背水堤範圍.json`)
      .then((res) => res.json())
      .then((data) => setBackwaterDikeGeojson(data))
      .catch((err) => console.error("無法載入背水堤範圍 JSON:", err));

    fetch(`${import.meta.env.BASE_URL}guangfu_boundary.geojson`)
      .then((res) => res.json())
      .then((data) => setGuangfuGeojson(data))
      .catch((err) => console.error("無法載入光復鄉界 GeoJSON:", err));
  }, []);

  useEffect(() => {
    if (nationalLandEnabled && !nationalLandGeojson && !isNationalLandLoading) {
      setIsNationalLandLoading(true);
      fetch(`${import.meta.env.BASE_URL}hualien_national_land.geojson`)
        .then((res) => res.json())
        .then((data) => {
          setNationalLandGeojson(data);
          setIsNationalLandLoading(false);
        })
        .catch((err) => {
          console.error("無法載入花蓮縣國有土地 GeoJSON:", err);
          setIsNationalLandLoading(false);
        });
    }
  }, [nationalLandEnabled, nationalLandGeojson, isNationalLandLoading]);

  // 已回報的點位只在回報災情模式出現，查詢與故事地圖不顯示
  const visibleReports = showReports ? reports : [];

  // 切換模式時清掉畫到一半的範圍與測量
  useEffect(() => {
    setDrawingPoints([]);
    setMeasureKind(null);
    setMeasurePoints([]);
    setMeasureDone(false);
  }, [mapMode]);

  // 測量時地圖雙擊不放大，避免連點兩個頂點時跳畫面
  useEffect(() => {
    if (!map) return;
    if (measureKind) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [map, measureKind]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("您的瀏覽器不支援定位功能。");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        onSelectLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errMsg = "無法取得您的位置。";
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = "請允許瀏覽器存取您的位置資訊。";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = "位置資訊不可用。";
        } else if (error.code === error.TIMEOUT) {
          errMsg = "定位逾時，請稍後再試。";
        }
        alert(errMsg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    const normQuery = normalizeAddress(searchQuery);

    if (addressDb.length > 0) {
      const coreSearch = normQuery
        .replace(/花蓮縣/g, "")
        .replace(/光復鄉/g, "")
        .replace(/鳳林鎮/g, "")
        .replace(/瑞穗鄉/g, "");

      const localMatch = addressDb.find(d => {
        const normA = normalizeAddress(d.a);

        if (normQuery.includes("光復鄉") && !normA.includes("光復鄉")) return false;
        if (normQuery.includes("鳳林鎮") && !normA.includes("鳳林鎮")) return false;
        if (normQuery.includes("瑞穗鄉") && !normA.includes("瑞穗鄉")) return false;

        return normA.includes(coreSearch);
      });

      if (localMatch) {
        setMapCenter([localMatch.y, localMatch.x]);
        onSelectLocation({ lat: localMatch.y, lng: localMatch.x });
        setIsSearching(false);
        return;
      }
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const q = searchQuery.includes("花蓮") ? searchQuery : `花蓮縣${searchQuery}`;

    try {
      if (apiKey) {
        const params = new URLSearchParams({
          address: q,
          key: apiKey,
          region: "tw",
          language: "zh-TW",
          bounds: "23.3,121.2|24.3,121.7",
        });

        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
        const data = await response.json();

        if (data.status === "OK" && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setMapCenter([lat, lng]);
          onSelectLocation({ lat, lng });
          setIsSearching(false);
          return;
        } else if (data.status === "REQUEST_DENIED") {
          console.warn("Google Maps API 請求被拒絕，自動切換至備用搜尋引擎 (OpenStreetMap)...", data.error_message);
        } else if (data.status === "ZERO_RESULTS") {
          alert("找不到此地址，請確認輸入是否有誤（建議輸入完整的街道或村里名稱）。");
          setIsSearching(false);
          return;
        }
      }

      const osmResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tw`, {
        headers: {
          "Accept-Language": "zh-TW",
        }
      });

      const osmData = await osmResponse.json();

      if (osmData && osmData.length > 0) {
        const lat = parseFloat(osmData[0].lat);
        const lng = parseFloat(osmData[0].lon);
        setMapCenter([lat, lng]);
        onSelectLocation({ lat, lng });
      } else {
        alert("找不到此地址，請確認輸入是否有誤。如果輸入的是地標，請嘗試輸入更完整的地址。");
      }

    } catch (error) {
      console.error("Geocoding error:", error);
      alert("搜尋地址時發生網路錯誤，請稍後再試。");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 範圍回報：加入多邊形頂點
  const handleAddDrawingPoint = (lat: number, lng: number) => {
    setDrawingPoints((prev) => [...prev, [lat, lng]]);
  };

  // 範圍回報：確認多邊形，並以幾何中心作為這筆回報的經緯度
  const handleConfirmPolygon = () => {
    if (drawingPoints.length < 3) return;

    // 計算幾何中心點 (Centroid)
    const latSum = drawingPoints.reduce((sum, pt) => sum + pt[0], 0);
    const lngSum = drawingPoints.reduce((sum, pt) => sum + pt[1], 0);
    const centerLat = latSum / drawingPoints.length;
    const centerLng = lngSum / drawingPoints.length;

    // 將中心點設為選取位置
    onSelectLocation({ lat: centerLat, lng: centerLng });

    // 觸發多邊形確認並傳遞座標給 App.tsx (用於地圖上當前多邊形的顯示渲染)
    if (onPolygonConfirm) {
      onPolygonConfirm(drawingPoints);
    }

    setDrawingPoints([]);
  };

  // 河川治理相關圖層（堤防用地範圍線、治理計畫線、背水堤範圍）
  const dikeLandLineLayer = (
    <FeatureGroup>
      {dikeLandLineGeojson && (
        <GeoJSON
          key={dikeLandLineGeojson.features.length}
          data={dikeLandLineGeojson}
          style={dikeLandStyle}
        />
      )}
    </FeatureGroup>
  );

  const governanceLineLayer = (
    <FeatureGroup>
      {governanceLineGeojson && (
        <GeoJSON
          key={governanceLineGeojson.features.length}
          data={governanceLineGeojson}
          style={governanceStyle}
        />
      )}
    </FeatureGroup>
  );

  const backwaterDikeLayer = (
    <FeatureGroup>
      {backwaterDikeGeojson && (
        <GeoJSON
          key={backwaterDikeGeojson.features.length}
          data={backwaterDikeGeojson}
          style={backwaterStyle}
        />
      )}
    </FeatureGroup>
  );

  const reserveGeojsonLayer = (
    <FeatureGroup>
      {reserveGeojson && (
        <GeoJSON
          key={reserveGeojson.features ? reserveGeojson.features.length : "loaded"}
          data={reserveGeojson}
          style={reserveStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              layer.bindPopup(
                `<div style="font-size: 14px; min-width: 150px;">
                  <p style="margin: 0 0 5px 0; font-weight: 700; color: #b45309;">原住民保留地</p>
                  <p style="margin: 0 0 3px 0;"><strong>縣市：</strong>${props["縣市名"] || ""}</p>
                  <p style="margin: 0 0 3px 0;"><strong>鄉鎮：</strong>${props["鄉鎮名"] || ""}</p>
                  <p style="margin: 0 0 3px 0;"><strong>地段名：</strong>${props["地段名"] || ""}</p>
                </div>`
              );
            }
          }}
        />
      )}
    </FeatureGroup>
  );

  const taiSugarGeojsonLayer = (
    <FeatureGroup>
      {taiSugarGeojson && (
        <GeoJSON
          key={taiSugarGeojson.features ? taiSugarGeojson.features.length : "loaded_ts"}
          data={taiSugarGeojson}
          style={taiSugarStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              const zone = props.LandUsageZoneName || "未提供";
              const method = props.RevitalizationMethodName || props.RevitalizartionMethodName || "未提供";
              layer.bindPopup(
                `<div style="font-size: 14px; min-width: 170px;">
                  <p style="margin: 0 0 6px 0; font-weight: 700; color: #047857; font-size: 15px;">台糖公司可供釋出土地 (花蓮縣)</p>
                  <p style="margin: 0 0 4px 0;"><strong>使用分區：</strong>${zone}</p>
                  <p style="margin: 0 0 2px 0;"><strong>活化方式：</strong>${method}</p>
                </div>`
              );
            }
          }}
        />
      )}
    </FeatureGroup>
  );

  const nationalLandGeojsonLayer = (
    <FeatureGroup>
      {nationalLandGeojson && (
        <GeoJSON
          key={nationalLandGeojson.features ? nationalLandGeojson.features.length : "loaded_nl"}
          data={nationalLandGeojson}
          style={nationalLandStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              const county = props["縣市"] || props["c"] || "未提供";
              const town = props["鄉鎮市區"] || props["t"] || "未提供";
              const sectCode = props["段代碼"] || props["sc"] || "未提供";
              const sectName = props["段小段"] || props["sn"] || "未提供";
              const landNo = props["地號"] || props["n"] || "未提供";
              const rawLandNo = props["地號原碼"] || props["rn"] || "未提供";
              const valM2 = props["登記面積_m2"] ?? props["m2"];
              const areaM2 = valM2 != null ? `${Number(valM2).toLocaleString()} m²` : "未提供";
              const valHa = props["登記面積_ha"] ?? props["ha"];
              const areaHa = valHa != null ? `${valHa} 公頃` : "未提供";
              const manager = props["管理機關"] || props["m"] || "未提供";
              const owner = props["所有權人"] || props["o"] || "未提供";

              layer.bindPopup(
                `<div style="font-size: 14px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.55;">
                  <div style="background-color: #eff6ff; padding: 8px 12px; margin: -10px -10px 10px -10px; border-bottom: 2px solid #3b82f6; border-radius: 4px 4px 0 0;">
                    <h4 style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 700;">🏛️ 花蓮縣國有土地</h4>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px; color: #334155;">
                    <p style="margin: 0;"><strong>📍 行政區劃：</strong>${county} ${town}</p>
                    <p style="margin: 0;"><strong>🏷️ 地段名稱：</strong>${sectName} <span style="color: #64748b; font-size: 12px;">(${sectCode})</span></p>
                    <p style="margin: 0;"><strong>🔢 地號：</strong><span style="color: #0284c7; font-weight: 700;">${landNo}</span> <span style="color: #64748b; font-size: 12px;">(原碼: ${rawLandNo})</span></p>
                    <p style="margin: 0;"><strong>📐 登記面積：</strong>${areaM2} <span style="color: #64748b; font-size: 12px;">(${areaHa})</span></p>
                    <p style="margin: 0;"><strong>🏢 管理機關：</strong><span style="color: #15803d; font-weight: 600;">${manager}</span></p>
                    <p style="margin: 0;"><strong>👤 所有權人：</strong>${owner}</p>
                  </div>
                </div>`
              );
            }
          }}
        />
      )}
    </FeatureGroup>
  );

  return (
    <div className={`map-view${layersOpen ? " layers-open" : ""}${measureKind ? " measuring" : ""}`}>
      <div className="map-search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜尋地址"
          aria-label="搜尋地址"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || isLocating}
          title="搜尋"
        >
          {isSearching ? <span className="locate-spinner" /> : <Search size={18} />}
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: "450px" }}>
        
        {/* 回報時的操作提示與「重畫」「取消」 */}
        {mapMode !== 'query' && (
          <>
            <div className="draw-hint" role="status" hidden={hideDrawHint}>
              {mapMode === 'point'
                ? selectedLocation
                  ? "按地圖上的「確認點位」開始填報，或點其他位置重選"
                  : "↓ 請點選地圖上的受災位置 ↓"
                : drawingPoints.length >= 3
                ? "按「確認範圍」完成，或繼續點選加入頂點"
                : drawingPoints.length === 0 && confirmedPolygon.length >= 3
                ? "範圍已確認，請在左側填寫；要重新圈選請按「重畫」"
                : `↓ 請在地圖上依序點出受災範圍（${drawingPoints.length}/3） ↓`}
            </div>
            <div className="draw-actions">
              {mapMode === 'area' && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawingPoints([]);
                    onClearPolygon?.();
                  }}
                  disabled={drawingPoints.length === 0 && confirmedPolygon.length === 0}
                >
                  <Trash2 size={16} />
                  重畫
                </button>
              )}
              <button type="button" onClick={onCancelDraw}>
                取消
              </button>
            </div>
          </>
        )}

        {/* 載入中橫幅 */}
        {isNationalLandLoading && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              backgroundColor: "rgba(30, 58, 138, 0.95)",
              color: "white",
              padding: "10px 22px",
              borderRadius: "30px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backdropFilter: "blur(4px)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div className="locate-spinner"></div>
            <span>正在加載花蓮縣公有土地圖層資料 (含屬性資料)...</span>
          </div>
        )}

        {/* 縮放警告提示橫幅 */}
        {cadastralEnabled && zoomLevel < 13 && (
          <div
            style={{
              position: "absolute",
              top: mapMode === 'query' ? "72px" : "120px", // 避開左上搜尋欄與回報時的操作提示
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              color: "#1e3a8a",
              border: "1px solid #bfdbfe",
              padding: "10px 18px",
              borderRadius: "30px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backdropFilter: "blur(4px)",
              pointerEvents: "none",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <span>💡 提示：請放大地圖 (縮放級別 &ge; 13) 以顯示地籍圖！目前級別：{zoomLevel}</span>
          </div>
        )}
        
        <MapContainer
          ref={setMap}
          bounds={GUANGFU_BOUNDS} // 開啟時直接顯示整個光復鄉
          zoomControl={false} // 縮放改由右側工具列操作
          maxZoom={22} // 解鎖地圖容器的最大縮放限制
          preferCanvas={true}
          style={{
            flex: 1,
            minHeight: "450px",
            width: "100%",
            borderRadius: "0", // 改成直角，不要圓角
            overflow: "hidden",
          }}
        >
          {/* 基本底圖（擇一） */}
          {activeBase === "emap" && (
            <TileLayer
              key="emap"
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          )}
          {activeBase === "photo2" && (
            <TileLayer
              key="photo2"
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          )}
          {activeBase in SENTINEL2_SCENES && (
            <TileLayer
              key={activeBase}
              attribution={`Contains modified Copernicus Sentinel data ${SENTINEL2_SCENES[activeBase].date.slice(0, 4)} &middot; Microsoft Planetary Computer`}
              url={sentinel2TileUrl(SENTINEL2_SCENES[activeBase].item)}
              maxNativeZoom={15}
              maxZoom={20}
            />
          )}
          {activeBase === "aerial20251116" && (
            <LayerGroup key="aerial20251116">
              {postDisasterAerialUrls.map((url) => (
                <TileLayer
                  key={url}
                  attribution="&copy; 農業部林業及自然保育署航測及遙測分署、內政部國土測繪中心"
                  url={url}
                  maxZoom={20}
                />
              ))}
            </LayerGroup>
          )}
          {activeBase === "photo2025" && (
            <TileLayer
              key="photo2025"
              attribution="&copy; 內政部國土測繪中心"
              url={nlscTileUrl("PHOTO2025")}
              maxZoom={20}
            />
          )}
          {activeBase === "emap5" && (
            <TileLayer
              key="emap5"
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          )}
          {activeBase === "hlmap" && (
            <TileLayer
              key="hlmap"
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/HLMAP_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
          )}
          {/* 縣府圖磚在 z14 以下只有空白圖框，這幾層改用 114 年正射補上 */}
          {activeBase === "hlimage" && (
            <LayerGroup key="hlimage">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url={nlscTileUrl("PHOTO2025")}
                maxZoom={14}
              />
              <TileLayer
                attribution="&copy; 花蓮縣政府"
                url="https://map.hl.gov.tw/arcgis/rest/services/HL_Image_3857/MapServer/tile/{z}/{y}/{x}"
                minZoom={15}
                maxZoom={20}
              />
            </LayerGroup>
          )}

          {/* 額外圖層（可多選，透明度由圖層面板調整）。圖磚圖層設 zIndex 疊在底圖上方，換底圖時不會被蓋住 */}
          {isOn("guangfu") && guangfuGeojson && (
            <GeoJSON data={guangfuGeojson} interactive={false} style={guangfuStyle} />
          )}
          {isOn("town") && (
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/TOWN/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={opacityOf("town")}
              zIndex={11}
            />
          )}
          {isOn("village") && (
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/Village/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={opacityOf("village")}
              zIndex={12}
            />
          )}
          {isOn("landsect") && (
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/LANDSECT/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.8 * opacityOf("landsect")}
              zIndex={13}
            />
          )}
          {isOn("dikeLand") && dikeLandLineLayer}
          {isOn("governance") && governanceLineLayer}
          {isOn("backwater") && backwaterDikeLayer}
          {isOn("reserve") && reserveGeojsonLayer}
          {isOn("taisugar") && taiSugarGeojsonLayer}
          {isOn("nationalLand") && nationalLandGeojsonLayer}
          {isOn("cadastral") && zoomLevel >= 13 && (
            <TileLayer
              attribution="&copy; 花蓮縣光復地政事務所"
              url={`${import.meta.env.BASE_URL}cadastral_tiles/{z}/{x}/{y}.png`}
              maxZoom={22}
              maxNativeZoom={18} // 設為 18 作防禦性容錯，大於 18 時自動放大 18 級切片。若確認 19、20 資料夾已放入此專案路徑，可改為 20 以加載實體高清切片。
              minZoom={13}
              opacity={0.85 * opacityOf("cadastral")}
              zIndex={14}
            />
          )}
          {isOn("landOpendata") && (
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/LAND_OPENDATA/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.75 * opacityOf("landOpendata")}
              zIndex={15}
            />
          )}
          {isOn("upZone") && (
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/UP/UP_ZONE_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              opacity={0.6 * opacityOf("upZone")}
              zIndex={16}
            />
          )}

          {/* 範圍回報：已確認的範圍，以及正在畫的範圍與頂點 */}
          {mapMode === 'area' && drawingPoints.length === 0 && confirmedPolygon.length >= 3 && (
            <Polygon positions={confirmedPolygon} pathOptions={{ color: "#000000", weight: 3, fillColor: "#FEA900", fillOpacity: 0.35 }} />
          )}
          {mapMode === 'area' && drawingPoints.length > 0 && (
            <>
              <Polygon
                positions={drawingPoints}
                pathOptions={{ color: "#000000", weight: 3, dashArray: "6 6", fillColor: "#FEA900", fillOpacity: 0.3 }}
              />
              {drawingPoints.map((pt, idx) => (
                <CircleMarker 
                  key={idx} 
                  center={pt} 
                  radius={5} 
                  color="#000000" 
                  fillColor="#FEA900" 
                  fillOpacity={1} 
                  weight={2} 
                />
              ))}
              {drawingPoints.length >= 3 && (
                <Marker
                  position={drawingPoints[drawingPoints.length - 1]}
                  icon={confirmAreaIcon}
                  zIndexOffset={3000}
                  eventHandlers={{ click: handleConfirmPolygon }}
                />
              )}
            </>
          )}

          <MapUpdater center={mapCenter} />
          <FlyToUpdater location={lastSubmittedLocation} />
          
          {measureKind ? (
            <MeasureLayer
              kind={measureKind}
              points={measurePoints}
              setPoints={setMeasurePoints}
              done={measureDone}
              setDone={setMeasureDone}
            />
          ) : (
            <LocationPicker
              onSelectLocation={onSelectLocation}
              mapMode={mapMode}
              onAddDrawingPoint={handleAddDrawingPoint}
            />
          )}

          <ScaleControl position="bottomleft" imperial={false} />
          
          <ZoomTracker onZoomChange={setZoomLevel} />

          {/* 地點回報：選好的點上方顯示「確認點位」 */}
          {mapMode === 'point' && selectedLocation && (
            <Marker
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={confirmPointIcon}
              zIndexOffset={3000}
              eventHandlers={{ click: () => onConfirmGeneralLocation?.() }}
            />
          )}

          {selectedLocation && !(mapMode === 'area' && confirmedPolygon.length >= 3) && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={bounceIcon}>
              <Popup>
                <div style={{ minWidth: "220px", fontSize: "14px" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: "15px", color: "#1e3a8a" }}>
                    {mapMode === 'query' ? "📍 搜尋到的位置" : "🎯 已選取填報位置"}
                  </p>
                  <PopupRow label="緯度：" value={selectedLocation.lat} />
                  <PopupRow label="經度：" value={selectedLocation.lng} />

                  {mapMode === 'point' && (
                  <button
                    onClick={() => {
                      if (onConfirmGeneralLocation) {
                        onConfirmGeneralLocation();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "13px",
                      marginTop: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                  >
                    📝 確認點位，開始填報
                  </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {visibleReports
            // 即時災情的範圍只畫多邊形；一般災情畫了範圍的，中心點仍保留標記以便查看完整資料
            .filter((report) => report.lat !== null && report.lng !== null && !(isInstantReport(report) && parsePolygonFromAddress(report.address)))
            .map((report, index) => {
              const isLatest = lastSubmittedLocation &&
                report.lat === lastSubmittedLocation.lat &&
                report.lng === lastSubmittedLocation.lng;

              return (
                <Marker
                  key={index}
                  position={[report.lat!, report.lng!]}
                  icon={isLatest ? pulseIcon : defaultIcon}
                  zIndexOffset={isLatest ? 1000 : 0}
                >
                  <Popup>
                    <div
                      style={{
                        minWidth: "220px",
                        maxWidth: "260px",
                        fontSize: "14px",
                        color: "#1f2937",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 10px 0",
                          fontWeight: 700,
                          fontSize: "16px",
                          color: "#1f2d3d",
                        }}
                      >
                        填報資料摘要
                      </p>

                      <PopupRow label="資料日期：" value={report.reportDate} />
                      <PopupRow label="填表人：" value={report.respondentType} />
                      <PopupRow label="所屬部落：" value={report.tribeName || "未填"} />
                      <PopupRow label="地址：" value={report.address || "未填"} />

                      <PopupRow label="地號：" value={report.landParcel || "未填"} />
                      <PopupRow label="土地受災：" value={report.hasLandDamage} />
                      <PopupRow label="建物受災：" value={report.hasBuildingDamage} />

                      {report.hasLandDamage === "是" && (
                        <DetailBlock title="查看土地受災詳細資料">
                          <PopupRow label="土地受災戶：" value={report.landVictimType} />
                          <PopupRow
                            label="土地泥沙高度："
                            value={report.landMudHeight || "未填"}
                          />
                          <PopupRow label="土地受災程度：" value={report.landDamageLevel} />
                        </DetailBlock>
                      )}

                      {report.hasBuildingDamage === "是" && (
                        <DetailBlock title="查看建物受災詳細資料">
                          <PopupRow label="建物受災戶：" value={report.buildingVictimType} />
                          <PopupRow
                            label="建物型態："
                            value={
                              report.buildingType === "其它" && report.buildingTypeOther
                                ? `${report.buildingType}（${report.buildingTypeOther}）`
                                : report.buildingType
                            }
                          />
                          <PopupRow
                            label="建物樓層數："
                            value={report.buildingFloors ?? "未填"}
                          />
                          <PopupRow
                            label="建物居住人數："
                            value={report.buildingResidents ?? "未填"}
                          />
                          <PopupRow label="建物建築材質：" value={report.buildingMaterial} />
                          <PopupRow
                            label="建物有無建造執照："
                            value={report.hasBuildingPermit}
                          />
                          <PopupRow
                            label="建物有無使用執照："
                            value={report.hasUsePermit}
                          />
                          <PopupRow
                            label="建物災時淹水高度："
                            value={report.buildingFloodHeight || "未填"}
                          />
                          <PopupRow
                            label="建物目前泥沙堆積高度："
                            value={report.buildingMudHeight || "未填"}
                          />
                          <PopupRow
                            label="建物受災程度："
                            value={report.buildingDamageLevel}
                          />
                          <PopupRow
                            label="建物受損面積："
                            value={
                              report.damagedAreaPing !== null
                                ? `${report.damagedAreaPing} 坪`
                                : "未填"
                            }
                          />
                        </DetailBlock>
                      )}

                      <DetailBlock title="查看其他基本資料">
                        <PopupRow label="權屬情況：" value={report.ownership} />
                        <PopupRow label="用途：" value={report.usage} />
                        <PopupRow label="是否原保地：" value={report.isIndigenousReserve} />
                      </DetailBlock>

                      <DetailBlock title="查看座標資訊">
                        <PopupRow label="緯度：" value={report.lat} />
                        <PopupRow label="經度：" value={report.lng} />
                      </DetailBlock>

                      {report.photos && report.photos.length > 0 && (
                        <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                          <button
                            onClick={() => setLightboxData({ photos: report.photos!, index: 0 })}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "15px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              transition: "background-color 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                          >
                            查看現場照片 ({report.photos.length} 張)
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* 渲染所有已上載的即時災情多邊形災害範圍 */}
          {visibleReports.map((report, idx) => {
            const polygonPoints = parsePolygonFromAddress(report.address);
            if (!polygonPoints) return null;

            return (
              <Polygon
                key={`submitted-poly-${idx}`}
                positions={polygonPoints}
                color="#ea580c"
                fillColor="#ea580c"
                fillOpacity={0.25}
                weight={3}
              >
                <Popup>
                  <div
                    style={{
                      minWidth: "220px",
                      maxWidth: "260px",
                      fontSize: "14px",
                      color: "#1f2937",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontWeight: 700,
                        fontSize: "16px",
                        color: "#ea580c",
                      }}
                    >
                      {isInstantReport(report) ? "即時災情範圍" : "一般災情範圍"}
                    </p>

                    <PopupRow label="資料日期：" value={report.reportDate} />
                    <PopupRow label="填表人：" value={report.respondentType} />
                    <PopupRow label="所屬部落：" value={report.tribeName || "未填"} />
                    <PopupRow
                      label={isInstantReport(report) ? "災情內容：" : "地址："}
                      value={report.address.split(/ ?\| ?災害範圍 \(多邊形點位\):|^災害範圍 \(多邊形點位\):/)[0] || "未填"}
                    />
                    {!isInstantReport(report) && (
                      <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#505B54" }}>點範圍中心的標記可查看完整填報內容。</p>
                    )}

                    {report.photos && report.photos.length > 0 && (
                      <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                        <button
                          onClick={() => setLightboxData({ photos: report.photos!, index: 0 })}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "15px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "background-color 0.2s"
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                        >
                          查看現場照片 ({report.photos.length} 張)
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}
          {story && (
            <StoryLayer
              regions={story.regions}
              selectedId={story.selectedId}
              onSelect={story.onSelect}
              onOpenPhoto={story.onOpenPhoto}
            />
          )}
        </MapContainer>

        <MapToolbar
          map={map}
          layersOpen={layersOpen}
          onToggleLayers={() => setLayersOpen((open) => !open)}
          onLocate={handleLocate}
          isLocating={isLocating}
          measureKind={measureKind}
          onMeasureKindChange={(kind) => {
            if (kind !== measureKind) {
              setMeasurePoints([]);
              setMeasureDone(false);
            }
            setMeasureKind(kind);
          }}
          measurePoints={measurePoints}
          measureDone={measureDone}
          onClearMeasure={() => {
            setMeasurePoints([]);
            setMeasureDone(false);
          }}
        />

        {layersOpen && (
          <LayerPanel
            baseLayers={BASE_LAYERS}
            activeBase={activeBase}
            onBaseChange={setActiveBase}
            overlays={OVERLAYS}
            overlayState={overlayState}
            onToggleOverlay={(id, on) =>
              setOverlayState((prev) => ({ ...prev, [id]: { ...prev[id], on } }))
            }
            onTransparencyChange={(id, transparency) =>
              setOverlayState((prev) => ({ ...prev, [id]: { ...prev[id], transparency } }))
            }
            onClose={() => setLayersOpen(false)}
          />
        )}
      </div>

      {lightboxData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setLightboxData(null)}
        >
          <img
            src={lightboxData.photos[lightboxData.index]}
            alt={`現場照片 ${lightboxData.index + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 600,
              background: "rgba(0,0,0,0.5)",
              padding: "6px 16px",
              borderRadius: "20px"
            }}
          >
            {lightboxData.index + 1} / {lightboxData.photos.length}
          </div>

          <button
            onClick={() => setLightboxData(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.4)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            ×
          </button>

          {lightboxData.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData({
                    ...lightboxData,
                    index: (lightboxData.index - 1 + lightboxData.photos.length) % lightboxData.photos.length
                  });
                }}
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "50px",
                  height: "50px",
                  fontSize: "28px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.4)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData({
                    ...lightboxData,
                    index: (lightboxData.index + 1) % lightboxData.photos.length
                  });
                }}
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "50px",
                  height: "50px",
                  fontSize: "28px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.4)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MapView;