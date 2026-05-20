import { useState, useEffect, useMemo, type ReactNode } from "react";
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
} from "react-leaflet";
import type { Report } from "../types/report";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type LatLngExpression } from "leaflet";
import { Locate } from "lucide-react";

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type MapViewProps = {
  reports: Report[];
  selectedLocation: SelectedLocation;
  onSelectLocation: (location: { lat: number; lng: number }) => void;
  lastSubmittedLocation?: SelectedLocation;
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

function LocationPicker({
  onSelectLocation,
}: {
  onSelectLocation: (location: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      onSelectLocation({ lat, lng });
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

const SECTION_NAMES: { [key: string]: string } = {
  '0201': '大安段',
  '0202': '大平段',
  '0223': '馬遠段',
  '0224': '紅葉段',
  '0226': '鳳光段',
  '0227': '鳳明段',
  '0239': '東富段',
  '0240': '太巴塱段',
  '0241': '溪州段',
  '0242': '達莫段',
  '0243': '砂荖段',
  '0244': '西富段',
  '0245': '馬佛段',
  '0246': '林榮段',
  '0248': '北林段',
  '0249': '大榮段',
  '0250': '鳳信段',
  '0251': '南平段',
  '0252': '鳳義段',
  '0253': '鳳凰段',
  '0277': '大馬段',
  '0278': '綜開段',
  '0280': '水廣段',
  '0281': '新莊段',
  '0282': '大全段',
  '0283': '鳳榮段',
  '0284': '森榮段',
  '0285': '長橋段',
  '0286': '中心埔段',
  '0287': '大豐段',
  '0288': '大和段',
  '0289': '大興段',
  '0290': '富豐段',
  '0291': '西寶段',
  '0292': '中興段',
  '0293': '箭瑛段',
  '0294': '加里洞段',
  '0295': '山崎段',
  '0297': '阿托莫段',
  '0298': '南富段',
  '0299': '大農段',
  '0902': '支亞干段',
  '0903': '新白陽段',
  '0904': '萬寶段',
  '0905': '萬利段',
  '0906': '古努安段',
  '0914': '悅付南段',
  '0919': '馬錫山段',
  '0920': '嘉羅蘭段',
  '0923': '里烈可段',
};

function ZoomTracker({
  onZoomChange,
  onOverlayToggle,
  onBoundsChange,
}: {
  onZoomChange: (zoom: number) => void;
  onOverlayToggle: (name: string, enabled: boolean) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
      onBoundsChange(map.getBounds());
    },
    moveend() {
      onBoundsChange(map.getBounds());
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
    onBoundsChange(map.getBounds());
  }, [map, onZoomChange, onBoundsChange]);

  return null;
}

// 計算單個 GeoJSON feature 的 bounding box [minLng, minLat, maxLng, maxLat]
function getFeatureBBox(feature: any): [number, number, number, number] {
  if (feature.bbox) return feature.bbox;
  
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const processCoords = (coords: any) => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (let i = 0; i < coords.length; i++) {
        processCoords(coords[i]);
      }
    }
  };
  
  processCoords(feature.geometry.coordinates);
  feature.bbox = [minLng, minLat, maxLng, maxLat];
  return feature.bbox;
}

const normalizeAddress = (addr: string) => {
  return addr
    .replace(/台/g, "臺")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, "");
};

function MapView({
  reports,
  selectedLocation,
  onSelectLocation,
  lastSubmittedLocation,
}: MapViewProps) {
  const defaultCenter: LatLngExpression = [23.669, 121.423];

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [reserveGeojson, setReserveGeojson] = useState<any>(null);
  const [cadastralGeojson, setCadastralGeojson] = useState<any>(null);
  const [addressDb, setAddressDb] = useState<{ a: string, x: number, y: number }[]>([]);
  const [lightboxData, setLightboxData] = useState<{ photos: string[]; index: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [cadastralEnabled, setCadastralEnabled] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // 篩選與目前地圖範圍相交的地籍圖特徵 (zoomLevel >= 15 才做，避免效能耗損)
  const filteredCadastralGeojson = useMemo(() => {
    if (!cadastralGeojson || !cadastralGeojson.features || !mapBounds || zoomLevel < 15) {
      return { type: "FeatureCollection" as const, features: [] };
    }

    const west = mapBounds.getWest();
    const south = mapBounds.getSouth();
    const east = mapBounds.getEast();
    const north = mapBounds.getNorth();

    // 進行高效邊界相交過濾
    const filtered = cadastralGeojson.features.filter((feature: any) => {
      if (!feature.geometry) return false;
      const [minLng, minLat, maxLng, maxLat] = getFeatureBBox(feature);
      return (
        minLng <= east &&
        maxLng >= west &&
        minLat <= north &&
        maxLat >= south
      );
    });

    return {
      type: "FeatureCollection" as const,
      features: filtered
    };
  }, [cadastralGeojson, mapBounds, zoomLevel]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fataan_reserve.geojson`)
      .then((res) => res.json())
      .then((data) => setReserveGeojson(data))
      .catch((err) => console.error("無法載入原住民保留地 GeoJSON:", err));

    fetch(`${import.meta.env.BASE_URL}hualien_guangfu_107.geojson`)
      .then((res) => res.json())
      .then((data) => setCadastralGeojson(data))
      .catch((err) => console.error("無法載入107年光復鄉地籍圖 GeoJSON:", err));

    fetch(`${import.meta.env.BASE_URL}address_db.json`)
      .then((res) => res.json())
      .then((data) => setAddressDb(data))
      .catch((err) => console.error("載入本地門牌資料庫失敗：", err));
  }, []);

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

    // 0. 優先使用本地 CSV 地址庫比對
    if (addressDb.length > 0) {
      // 為了處理使用者輸入時省略「村里」名稱的問題（例如資料庫為「花蓮縣光復鄉大同村中山路三段82號」，使用者僅輸入「花蓮縣光復鄉中山路三段82號」）
      // 我們將行政區的字眼先過濾掉，取得核心的「街道+門牌」當作比對關鍵字
      const coreSearch = normQuery
        .replace(/花蓮縣/g, "")
        .replace(/光復鄉/g, "")
        .replace(/鳳林鎮/g, "")
        .replace(/瑞穗鄉/g, "");

      const localMatch = addressDb.find(d => {
        const normA = normalizeAddress(d.a);

        // 如果使用者有特地指定鄉鎮，則確保該地址符合該鄉鎮
        if (normQuery.includes("光復鄉") && !normA.includes("光復鄉")) return false;
        if (normQuery.includes("鳳林鎮") && !normA.includes("鳳林鎮")) return false;
        if (normQuery.includes("瑞穗鄉") && !normA.includes("瑞穗鄉")) return false;

        // 核心字串比對（例如看 normA 是否包含 "中山路三段82號"）
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
      // 1. 嘗試使用 Google Maps API (如果有設定 Key 的話)
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

      // 2. 備用方案：使用完全免費的 OpenStreetMap (Nominatim) API
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
          地圖選點
        </h2>
        <p
          style={{
            margin: "8px 0 0 0",
            color: "#5b6b7a",
            fontSize: "14px",
          }}
        >
          點選地圖可指定填報位置；點擊圖標可查看既有資料。
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

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {cadastralEnabled && zoomLevel < 15 && (
          <div
            style={{
              position: "absolute",
              top: "14px",
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
            <span>💡 提示：請放大地圖 (縮放級別 &ge; 15) 以載入地籍圖界線！目前級別：{zoomLevel}</span>
          </div>
        )}
        <MapContainer
        center={defaultCenter}
        zoom={13}
        preferCanvas={true}
        style={{
          flex: 1,
          minHeight: 0,
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

          <LayersControl.BaseLayer name="臺灣通用電子地圖 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="臺灣通用電子地圖-正射影像 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="臺灣通用電子地圖-含等高線 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="花蓮縣通用電子地圖">
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/HLMAP_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="花蓮縣正射影像 (衛星空照)">
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/HL_Image_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="鄉鎮市區界 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/TOWN/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="村里界 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/Village/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="國土利用現況調查成果圖-全國最新 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/LUIMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.7}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="公有土地地籍圖 (國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/LAND_OPENDATA/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.8}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="原住民保留地 (光復鄉範圍)">
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
                          <p style="margin: 0 0 3px 0;"><strong>段名：</strong>${props["地段名"] || ""}</p>
                        </div>`
                      );
                    }
                  }}
                />
              )}
            </FeatureGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="107年光復鄉地籍圖">
            <FeatureGroup>
              {cadastralGeojson && zoomLevel >= 15 && filteredCadastralGeojson.features.length > 0 && (
                <GeoJSON
                  key={`cadastral-z${zoomLevel}-f${filteredCadastralGeojson.features.length}-${
                    filteredCadastralGeojson.features[0]?.properties 
                      ? `${filteredCadastralGeojson.features[0].properties["地段代碼"] || filteredCadastralGeojson.features[0].properties["段號_SCNO"] || ""}-${filteredCadastralGeojson.features[0].properties["母號"] || ""}-${filteredCadastralGeojson.features[0].properties["子號"] || ""}` 
                      : "empty"
                  }-${
                    filteredCadastralGeojson.features[filteredCadastralGeojson.features.length - 1]?.properties 
                      ? `${filteredCadastralGeojson.features[filteredCadastralGeojson.features.length - 1].properties["地段代碼"] || filteredCadastralGeojson.features[filteredCadastralGeojson.features.length - 1].properties["段號_SCNO"] || ""}-${filteredCadastralGeojson.features[filteredCadastralGeojson.features.length - 1].properties["母號"] || ""}-${filteredCadastralGeojson.features[filteredCadastralGeojson.features.length - 1].properties["子號"] || ""}` 
                      : "empty"
                  }`}
                  data={filteredCadastralGeojson}
                  style={{
                    color: "#2563eb",
                    weight: 1,
                    opacity: 0.8,
                    fillColor: "#3b82f6",
                    fillOpacity: 0.15,
                  }}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const props = feature.properties;
                      const sectCode = props["地段代碼"] || props["段號_SCNO"] || "";
                      const sectName = SECTION_NAMES[sectCode] || props["地段名_AA05"] || "未知地段";
                      
                      const mother = props["母號"] || "";
                      const child = props["子號"] || "";
                      const landNo = child && parseInt(child) !== 0 
                        ? `${parseInt(mother)}-${parseInt(child)}` 
                        : `${parseInt(mother)}`;
                      
                      const area = props["面積"] || props["AA10"] || "0";
                      const landClass = props["編定使用類別"] || props["AA08"] || "未編定";

                      layer.bindPopup(
                        `<div style="font-size: 14px; min-width: 180px; line-height: 1.5; color: #1e293b;">
                          <p style="margin: 0 0 8px 0; font-weight: 700; color: #2563eb; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                            107年光復鄉地籍圖
                          </p>
                          <p style="margin: 0 0 4px 0;"><strong>地段名稱：</strong>${sectName} (${sectCode})</p>
                          <p style="margin: 0 0 4px 0;"><strong>地號：</strong>${landNo}</p>
                          <p style="margin: 0 0 4px 0;"><strong>登記面積：</strong>${area} ㎡</p>
                          <p style="margin: 0 0 4px 0;"><strong>編定類別：</strong>${landClass}</p>
                          <p style="margin: 0 0 0 0; font-size: 12px; color: #64748b;"><strong>資料來源：</strong>花蓮縣鳳林地政事務所</p>
                        </div>`
                      );
                    }
                  }}
                />
              )}
            </FeatureGroup>
          </LayersControl.Overlay>


          {/* 都市土地與非都市土地 (地籍) 疊加層 */}
          <LayersControl.Overlay name="都市計畫分區圖 (都市土地)">
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/UP/UP_ZONE_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              opacity={0.6}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="全國段籍圖 (內政部國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/LANDSECT/default/GoogleMapsCompatible/{z}/{y}/{x}"
              maxZoom={20}
              opacity={0.8}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <MapUpdater center={mapCenter} />
        <FlyToUpdater location={lastSubmittedLocation} />
        <LocationPicker onSelectLocation={onSelectLocation} />
        <ZoomTracker
          onZoomChange={setZoomLevel}
          onBoundsChange={setMapBounds}
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
          .filter((report) => report.lat !== null && report.lng !== null)
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