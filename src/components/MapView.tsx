import { useState, useEffect, type ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  LayersControl,
} from "react-leaflet";
import type { Report } from "../types/report";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type LatLngExpression } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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

delete (L.Icon.Default.prototype as L.Icon.Default & {
  _getIconUrl?: unknown;
})._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const bounceIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "marker-bounce"
});

const pulseIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "marker-pulse"
});

const defaultIcon = new L.Icon.Default();

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        alert("尚未設定 Google Maps API Key！請在 .env 中設定 VITE_GOOGLE_MAPS_API_KEY。");
        return;
      }

      const q = searchQuery.includes("花蓮")
        ? searchQuery
        : `花蓮縣${searchQuery}`;

      const params = new URLSearchParams({
        address: q,
        key: apiKey,
        region: "tw",
        language: "zh-TW",
        bounds: "23.3,121.2|24.3,121.7",
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );

      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setMapCenter([lat, lng]);
        onSelectLocation({ lat, lng });
      } else {
        alert("找不到此地址，請確認輸入是否有誤。");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("搜尋地址時發生錯誤。");
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

          {/* 都市土地與非都市土地 (地籍) 疊加層 */}
          <LayersControl.Overlay name="都市計畫分區圖 (都市土地)">
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/UP/UP_ZONE_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              opacity={0.6}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="光復鄉地籍圖 (非都市土地)">
            <TileLayer
              attribution="&copy; 花蓮縣政府"
              url="https://map.hl.gov.tw/arcgis/rest/services/HLLAND/Land_0452_3857/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="全國段籍圖 (內政部國土測繪中心)">
            <TileLayer
              attribution="&copy; 內政部國土測繪中心"
              url="https://wmts.nlsc.gov.tw/wmts/Sect/default/GoogleMapsCompatible/{z}/{y}/{x}"
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