import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import type { Report } from "../types/report";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
    click(e) {
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
    <p style={{ margin: "0 0 8px 0", lineHeight: 1.5 }}>
      <strong>{label}</strong>
      {value ?? "未填"}
    </p>
  );
}

function MapView({
  reports,
  selectedLocation,
  onSelectLocation,
}: MapViewProps) {
  const defaultCenter: [number, number] = [23.669, 121.423];

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
          height: "680px",
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

        {reports.map((report, index) => (
          <Marker key={index} position={[report.lat, report.lng]}>
            <Popup>
              <div
                style={{
                  minWidth: "260px",
                  maxWidth: "320px",
                  fontSize: "14px",
                  color: "#1f2937",
                }}
              >
                <div style={{ marginBottom: "10px" }}>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "#1f2d3d",
                    }}
                  >
                    填報資料摘要
                  </p>
                </div>

                <PopupRow label="資料日期：" value={report.reportDate} />
                <PopupRow label="填表人：" value={report.respondentType} />
                <PopupRow label="地址：" value={report.address} />
                <PopupRow label="地號：" value={report.landParcel} />
                <PopupRow label="使用地類別／分區：" value={report.landUseType} />
                <PopupRow label="權屬情況：" value={report.ownership} />
                <PopupRow label="用途：" value={report.usage} />
                <PopupRow label="是否原保地：" value={report.isIndigenousReserve} />
                <PopupRow label="是否有土地受災：" value={report.hasLandDamage} />
                <PopupRow label="是否有建物受災：" value={report.hasBuildingDamage} />

                {report.hasLandDamage === "是" && (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      土地受災資訊
                    </p>
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
                  </div>
                )}

                {report.hasBuildingDamage === "是" && (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      建物受災資訊
                    </p>

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
                  </div>
                )}

                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    座標資訊
                  </p>
                  <PopupRow label="緯度：" value={report.lat} />
                  <PopupRow label="經度：" value={report.lng} />
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;