import type { ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
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
};

delete (L.Icon.Default.prototype as L.Icon.Default & {
  _getIconUrl?: unknown;
})._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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
}: MapViewProps) {
  const defaultCenter: LatLngExpression = [23.669, 121.423];

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
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationPicker onSelectLocation={onSelectLocation} />

        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
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
  .map((report, index) => (
    <Marker key={index} position={[report.lat!, report.lng!]}>
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
          <PopupRow label="地址：" value={report.address || "未填"} />
          <PopupRow label="地號：" value={report.landParcel || "未填"} />
          <PopupRow label="土地受災：" value={report.hasLandDamage} />
          <PopupRow label="建物受災：" value={report.hasBuildingDamage} />

          {report.hasLandDamage === "是" && (
            <DetailBlock title="查看土地受災詳細資料">
              <PopupRow label="土地受災戶：" value={report.landVictimType} />
              <PopupRow
                label="土地泥沙高度："
                value={
                  report.landMudHeight !== null
                    ? `${report.landMudHeight} 公分`
                    : "未填"
                }
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
              <PopupRow label="建物有無建造執照：" value={report.hasBuildingPermit} />
              <PopupRow label="建物有無使用執照：" value={report.hasUsePermit} />
              <PopupRow
                label="建物災時淹水高度："
                value={
                  report.buildingFloodHeight !== null
                    ? `${report.buildingFloodHeight} 公分`
                    : "未填"
                }
              />
              <PopupRow
                label="建物目前泥沙堆積高度："
                value={
                  report.buildingMudHeight !== null
                    ? `${report.buildingMudHeight} 公分`
                    : "未填"
                }
              />
              <PopupRow label="建物受災程度：" value={report.buildingDamageLevel} />
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

          <DetailBlock title="查看座標資訊">
            <PopupRow label="緯度：" value={report.lat} />
            <PopupRow label="經度：" value={report.lng} />
          </DetailBlock>
        </div>
      </Popup>
    </Marker>
  ))}
      </MapContainer>
    </div>
  );
}

export default MapView;