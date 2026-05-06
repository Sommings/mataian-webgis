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
} from "react-leaflet";
import type { Report } from "../types/report";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type LatLngExpression } from "leaflet";

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
  const [addressDb, setAddressDb] = useState<{ a: string, x: number, y: number }[]>([]);

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

      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入地址搜尋..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#3b82f6",
            color: "white",
            fontWeight: 600,
            cursor: isSearching ? "not-allowed" : "pointer",
            opacity: isSearching ? 0.7 : 1,
          }}
        >
          {isSearching ? "搜尋中..." : "搜尋"}
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{
          height: "520px",
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
                    <PopupRow label="地點名稱：" value={report.placeName || "未填"} />
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
                      <DetailBlock title="現場照片">
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                          {report.photos.map((photoUrl, idx) => (
                            <a key={idx} href={photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                              <img
                                src={photoUrl}
                                alt={`現場照片 ${idx + 1}`}
                                style={{
                                  width: "100%",
                                  maxHeight: "150px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid #e5e7eb"
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      </DetailBlock>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

export default MapView;