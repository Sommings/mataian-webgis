import { useState, useEffect, type ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  LayersControl,
  GeoJSON,
  FeatureGroup,
  Polygon,      // 引入 Polygon 元件
  CircleMarker, // 引入 CircleMarker 元件
} from "react-leaflet";
import type { Report } from "../types/report";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type LatLngExpression } from "leaflet";
import { Locate, ShieldAlert, Trash2, CheckCircle2, Play } from "lucide-react";

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
  lastSubmittedLocation?: SelectedLocation;
  mapMode: 'general' | 'instant';
  onPolygonConfirm?: (polygonPoints: [number, number][]) => void;
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
const pulseIcon = createCustomIcon("pulse");
const defaultIcon = createCustomIcon("default");

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

// 支援雙模式的互動點選器
function LocationPicker({
  onSelectLocation,
  mapMode,
  isDrawing,
  onAddDrawingPoint,
}: {
  onSelectLocation: (location: { lat: number; lng: number }) => void;
  mapMode: 'general' | 'instant';
  isDrawing: boolean;
  onAddDrawingPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      if (mapMode === 'instant' && isDrawing) {
        onAddDrawingPoint(lat, lng);
      } else {
        onSelectLocation({ lat, lng });
      }
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

function ZoomTracker({
  onZoomChange,
  onOverlayToggle,
}: {
  onZoomChange: (zoom: number) => void;
  onOverlayToggle: (name: string, enabled: boolean) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
    overlayadd(e) {
      onOverlayToggle(e.name, true);
    },
    overlayremove(e) {
      onOverlayToggle(e.name, false);
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
  lastSubmittedLocation,
  mapMode,
  onPolygonConfirm,
}: MapViewProps) {
  const defaultCenter: LatLngExpression = [23.669, 121.423];

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [reserveGeojson, setReserveGeojson] = useState<any>(null);
  const [addressDb, setAddressDb] = useState<{ a: string, x: number, y: number }[]>([]);
  const [lightboxData, setLightboxData] = useState<{ photos: string[]; index: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [cadastralEnabled, setCadastralEnabled] = useState(false);

  // PPGIS 多邊形災害範圍繪製 State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fataan_reserve.geojson`)
      .then((res) => res.json())
      .then((data) => setReserveGeojson(data))
      .catch((err) => console.error("無法載入原住民保留地 GeoJSON:", err));

    fetch(`${import.meta.env.BASE_URL}address_db.json`)
      .then((res) => res.json())
      .then((data) => setAddressDb(data))
      .catch((err) => console.error("載入本地門牌資料庫失敗：", err));
  }, []);

  // 重置即時模式的繪圖 State，如果 mapMode 切換
  useEffect(() => {
    setIsDrawing(false);
    setDrawingPoints([]);
  }, [mapMode]);

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

  // 即時模式：添加繪圖點位
  const handleAddDrawingPoint = (lat: number, lng: number) => {
    setDrawingPoints((prev) => [...prev, [lat, lng]]);
  };

  // 即時模式：確認受災多邊形並觸發回傳與選點（不計算中心點、不點選標記，直接儲存多邊形範圍）
  const handleConfirmPolygon = () => {
    if (drawingPoints.length < 3) {
      alert("請至少標記 3 個頂點以圈出災害範圍！");
      return;
    }

    // 觸發多邊形確認並傳遞座標給 App.tsx
    if (onPolygonConfirm) {
      onPolygonConfirm(drawingPoints);
    }

    // 關閉繪圖模式，清空本地繪圖點
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const reserveGeojsonLayer = (
    <FeatureGroup>
      {reserveGeojson && (
        <GeoJSON
          key={reserveGeojson.features ? reserveGeojson.features.length : "loaded"}
          data={reserveGeojson}
          style={{
            color: "#d97706",
            weight: 2,
            opacity: 0.8,
            fillColor: "#f59e0b",
            fillOpacity: 0.8,
          }}
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

  return (
    <div>
      <div style={{ marginBottom: "14px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "24px",
            color: "#1f2d3d",
          }}
        >
          {mapMode === 'instant' ? "即時災害範圍描繪" : "地圖選點"}
        </h2>
        <p
          style={{
            margin: "8px 0 0 0",
            color: "#5b6b7a",
            fontSize: "14px",
          }}
        >
          {mapMode === 'instant'
            ? "即時填報模式：請利用上方控制板繪製受災範圍，點選確認後將自動調出填報表單。"
            : "點選地圖可指定填報位置；點擊圖標可查看既有資料。"
          }
        </p>
      </div>

      <div className="map-search-bar" style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入地址搜尋..."
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || isLocating}
          style={{
            flex: "0 0 auto",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#3b82f6",
            color: "white",
            fontWeight: 600,
            cursor: (isSearching || isLocating) ? "not-allowed" : "pointer",
            opacity: (isSearching || isLocating) ? 0.7 : 1,
          }}
        >
          {isSearching ? "搜尋中..." : "搜尋地址"}
        </button>
        <button
          onClick={handleLocate}
          disabled={isSearching || isLocating}
          style={{
            flex: "0 0 auto",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #3b82f6",
            backgroundColor: "white",
            color: "#3b82f6",
            fontWeight: 600,
            cursor: (isSearching || isLocating) ? "not-allowed" : "pointer",
            opacity: (isSearching || isLocating) ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            if (!isSearching && !isLocating) {
              e.currentTarget.style.backgroundColor = "#eff6ff";
            }
          }}
          onMouseOut={(e) => {
            if (!isSearching && !isLocating) {
              e.currentTarget.style.backgroundColor = "white";
            }
          }}
        >
          <Locate size={18} />
          {isLocating ? "定位中..." : "定位目前位置"}
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: "450px" }}>
        
        {/* PPGIS 即時災害範圍繪圖控制面板 (毛玻璃高級質感) */}
        {mapMode === 'instant' && (
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(12px)",
              border: isDrawing ? "2px solid #ef4444" : "1.5px solid #cbd5e1",
              padding: "14px 20px",
              borderRadius: "20px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              width: "90%",
              maxWidth: "460px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} color={isDrawing ? "#dc2626" : "#475569"} />
              <span style={{ fontSize: "14.5px", fontWeight: 800, color: isDrawing ? "#991b1b" : "#1e293b" }}>
                {isDrawing ? "🔴 受災範圍描繪中..." : "🚨 即時災害範圍填報"}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: 1.5 }}>
              {isDrawing 
                ? `請在右側地圖上【點選頂點】以圍出災害範圍。目前已標記 ${drawingPoints.length} 個點（至少需 3 個點）。`
                : "點擊下方「開始繪製」按鈕，即可在地圖上連續點選，圈出即時泥沙淹水或受災區域。"
              }
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* 開始/重設繪製按鈕 */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawing(!isDrawing);
                  setDrawingPoints([]); // 切換時清空
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: isDrawing ? "#64748b" : "#ef4444",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                {isDrawing ? <Trash2 size={14} /> : <Play size={14} />}
                <span>{isDrawing ? "取消繪圖" : "📍 開始繪製範圍"}</span>
              </button>

              {/* 清除點位按鈕 */}
              {isDrawing && (
                <button
                  type="button"
                  onClick={() => setDrawingPoints([])}
                  disabled={drawingPoints.length === 0}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "white",
                    color: drawingPoints.length === 0 ? "#94a3b8" : "#475569",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: drawingPoints.length === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <Trash2 size={14} />
                  <span>清除</span>
                </button>
              )}

              {/* 確認範圍按鈕 */}
              {isDrawing && (
                <button
                  type="button"
                  onClick={handleConfirmPolygon}
                  disabled={drawingPoints.length < 3}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: drawingPoints.length < 3 ? "#cbd5e1" : "#16a34a",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: drawingPoints.length < 3 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    boxShadow: drawingPoints.length < 3 ? "none" : "0 4px 6px -1px rgba(22, 163, 74, 0.2)"
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>確認受災範圍</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 縮放警告提示橫幅 */}
        {cadastralEnabled && zoomLevel < 13 && (
          <div
            style={{
              position: "absolute",
              top: mapMode === 'instant' ? "145px" : "14px", // 在即時模式下避開頂部繪圖控制面板
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
          center={defaultCenter}
          zoom={13}
          preferCanvas={true}
          style={{
            flex: 1,
            minHeight: "450px",
            width: "100%",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="國土測繪圖資服務雲 (電子地圖)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="國土測繪圖資服務雲-正射影像 (正射影像圖)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="國土測繪圖資服務雲-混合地圖 (電子地圖)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="花蓮縣一般版地圖">
              <TileLayer
                attribution="&copy; 花蓮縣政府"
                url="https://map.hl.gov.tw/arcgis/rest/services/HLMAP_3857/MapServer/tile/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="花蓮縣正射影像 (空照圖)">
              <TileLayer
                attribution="&copy; 花蓮縣政府"
                url="https://map.hl.gov.tw/arcgis/rest/services/HL_Image_3857/MapServer/tile/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay name="鄉鎮市區界 (國土測繪服務雲)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/TOWN/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.Overlay>

            <LayersControl.Overlay name="村里界 (國土測繪服務雲)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/Village/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
              />
            </LayersControl.Overlay>

            <LayersControl.Overlay name="段籍圖-段界 (國土測繪服務雲)">
              <TileLayer
                attribution="&copy; 內政部國土測繪中心"
                url="https://wmts.nlsc.gov.tw/wmts/LANDSECT/default/GoogleMapsCompatible/{z}/{y}/{x}"
                maxZoom={20}
                opacity={0.8}
              />
            </LayersControl.Overlay>

            <LayersControl.Overlay name="原住民保留地 (大馬段範圍)">
              {reserveGeojsonLayer}
            </LayersControl.Overlay>

            <LayersControl.Overlay name="107年光復鄉地籍圖">
              {zoomLevel >= 13 && (
                <TileLayer
                  attribution="&copy; 花蓮縣光復地政事務所"
                  url={`${import.meta.env.BASE_URL}cadastral_tiles/{z}/{x}/{y}.png`}
                  maxZoom={18}
                  minZoom={13}
                  opacity={0.85}
                />
              )}
            </LayersControl.Overlay>

            <LayersControl.Overlay name="都市計畫土地使用分區圖">
              <TileLayer
                attribution="&copy; 花蓮縣政府"
                url="https://map.hl.gov.tw/arcgis/rest/services/UP/UP_ZONE_3857/MapServer/tile/{z}/{y}/{x}"
                maxZoom={22}
                opacity={0.6}
              />
            </LayersControl.Overlay>
          </LayersControl>

          {/* 即時受災多邊形與頂點的渲染 */}
          {isDrawing && drawingPoints.length > 0 && (
            <>
              <Polygon 
                positions={drawingPoints} 
                color="#ef4444" 
                fillColor="#ef4444" 
                fillOpacity={0.35} 
                weight={3} 
              />
              {drawingPoints.map((pt, idx) => (
                <CircleMarker 
                  key={idx} 
                  center={pt} 
                  radius={5} 
                  color="#dc2626" 
                  fillColor="white" 
                  fillOpacity={1} 
                  weight={2} 
                />
              ))}
            </>
          )}

          <MapUpdater center={mapCenter} />
          <FlyToUpdater location={lastSubmittedLocation} />
          
          <LocationPicker 
            onSelectLocation={onSelectLocation} 
            mapMode={mapMode}
            isDrawing={isDrawing}
            onAddDrawingPoint={handleAddDrawingPoint}
          />
          
          <ZoomTracker
            onZoomChange={setZoomLevel}
            onOverlayToggle={(name, enabled) => {
              if (name === "107年光復鄉地籍圖") {
                setCadastralEnabled(enabled);
              }
            }}
          />

          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={bounceIcon}>
              <Popup>
                <div style={{ minWidth: "220px", fontSize: "14px" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                    目前選擇位置
                  </p>
                  <PopupRow label="緯度：" value={selectedLocation.lat} />
                  <PopupRow label="經度：" value={selectedLocation.lng} />
                </div>
              </Popup>
            </Marker>
          )}

          {reports
            .filter((report) => report.lat !== null && report.lng !== null && parsePolygonFromAddress(report.address) === null)
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
          {reports.map((report, idx) => {
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
                      即時受災範圍 (多邊形)
                    </p>

                    <PopupRow label="資料日期：" value={report.reportDate} />
                    <PopupRow label="填表人：" value={report.respondentType} />
                    <PopupRow label="所屬部落：" value={report.tribeName || "未填"} />
                    <PopupRow 
                      label="災情內容：" 
                      value={report.address.split(" | 災害範圍 (多邊形點位):")[0] || "未填"} 
                    />

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
        </MapContainer>
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