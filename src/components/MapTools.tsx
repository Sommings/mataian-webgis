import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CircleMarker, Marker, Polygon, Polyline, useMap, useMapEvents } from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import { House, Layers, Locate, Minus, Plus, Ruler, X } from "lucide-react";
import { GUANGFU_BOUNDS } from "../lib/guangfu";

export type MeasureKind = "distance" | "area";
type LatLng = [number, number];

const EARTH_RADIUS = 6378137;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// 球面多邊形面積（與 Leaflet.draw 的 geodesicArea 相同算法），單位平方公尺
function geodesicArea(points: LatLng[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    area += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((area * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

function pathLength(map: LeafletMap, points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += map.distance(points[i - 1], points[i]);
  return total;
}

const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m).toLocaleString()} 公尺` : `${(m / 1000).toFixed(2)} 公里`;

const formatArea = (m2: number) =>
  m2 < 10000 ? `${Math.round(m2).toLocaleString()} 平方公尺` : `${(m2 / 10000).toFixed(2)} 公頃`;

// 小面積附坪數（與填報表單的受損面積同單位），大面積附平方公里
const formatAreaSub = (m2: number) =>
  m2 < 100000
    ? `約 ${Math.round(m2 * 0.3025).toLocaleString()} 坪`
    : `約 ${(m2 / 1e6).toFixed(2)} 平方公里`;

// 雙擊時瀏覽器會先送出兩次 click，第二個點和前一點幾乎重疊，結束時拿掉
const DUPLICATE_PX = 6;

function measureText(map: LeafletMap, kind: MeasureKind, points: LatLng[]): string | null {
  if (kind === "distance") return points.length >= 2 ? formatDistance(pathLength(map, points)) : null;
  return points.length >= 3 ? formatArea(geodesicArea(points)) : null;
}

/**
 * 地圖內的測量圖形與點擊收集，需放在 MapContainer 裡。
 * 點擊直接從地圖容器（捕獲階段）接收，點在堤防範圍等可點選的圖層上也能加點，測量時也不會打開彈出視窗。
 * 雙擊結束；結束後再點地圖會開始新的測量。
 */
export function MeasureLayer({
  kind,
  points,
  setPoints,
  done,
  setDone,
}: {
  kind: MeasureKind;
  points: LatLng[];
  setPoints: Dispatch<SetStateAction<LatLng[]>>;
  done: boolean;
  setDone: (done: boolean) => void;
}) {
  const map = useMap();
  const [hover, setHover] = useState<LatLng | null>(null);
  useMapEvents({
    mousemove(e) {
      setHover([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      setHover(null);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    const isControl = (e: MouseEvent) => (e.target as HTMLElement).closest(".leaflet-control") !== null;
    const toLatLng = (e: MouseEvent): LatLng => {
      const ll = map.mouseEventToLatLng(e);
      return [ll.lat, ll.lng];
    };
    const onClick = (e: MouseEvent) => {
      // 拖曳地圖放開時也會觸發 click，這種不算加點
      const dragging = map.dragging as L.Handler & { moved?: () => boolean };
      if (isControl(e) || dragging.moved?.()) return;
      e.stopPropagation();
      const p = toLatLng(e);
      if (done) {
        setDone(false);
        setPoints([p]);
      } else {
        setPoints((prev) => [...prev, p]);
      }
    };
    const onDblClick = (e: MouseEvent) => {
      if (isControl(e)) return;
      e.stopPropagation();
      setPoints((prev) => {
        if (prev.length < 2) return prev;
        const a = map.latLngToContainerPoint(prev[prev.length - 2]);
        const b = map.latLngToContainerPoint(prev[prev.length - 1]);
        return a.distanceTo(b) < DUPLICATE_PX ? prev.slice(0, -1) : prev;
      });
      setDone(true);
    };
    container.addEventListener("click", onClick, true);
    container.addEventListener("dblclick", onDblClick, true);
    return () => {
      container.removeEventListener("click", onClick, true);
      container.removeEventListener("dblclick", onDblClick, true);
    };
  }, [map, done, setDone, setPoints]);

  const style = { color: "#000000", weight: 3, dashArray: "6 6" };
  const preview = hover && points.length > 0 && !done ? [...points, hover] : points;
  const text = measureText(map, kind, points);
  const last = points[points.length - 1];
  return (
    <>
      {kind === "area" && preview.length >= 3 ? (
        <Polygon positions={preview} pathOptions={{ ...style, fillColor: "#FEA900", fillOpacity: 0.25 }} interactive={false} />
      ) : (
        preview.length >= 2 && <Polyline positions={preview} pathOptions={style} interactive={false} />
      )}
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={5}
          pathOptions={{ color: "#000000", weight: 2, fillColor: "#FEA900", fillOpacity: 1 }}
          interactive={false}
        />
      ))}
      {text && last && (
        <Marker
          position={last}
          interactive={false}
          keyboard={false}
          icon={L.divIcon({
            className: "measure-result-marker",
            html: `<span class="measure-result-label${done ? " done" : ""}">${text}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      )}
    </>
  );
}

/** 右側直排工具列與測量結果面板，放在地圖容器外面疊在地圖上，點擊不會穿透成選點 */
export function MapToolbar({
  map,
  layersOpen,
  onToggleLayers,
  onLocate,
  isLocating,
  measureKind,
  onMeasureKindChange,
  measurePoints,
  measureDone,
  onClearMeasure,
}: {
  map: LeafletMap | null;
  layersOpen: boolean;
  onToggleLayers: () => void;
  onLocate: () => void;
  isLocating: boolean;
  measureKind: MeasureKind | null;
  onMeasureKindChange: (kind: MeasureKind | null) => void;
  measurePoints: LatLng[];
  measureDone: boolean;
  onClearMeasure: () => void;
}) {
  const measuring = measureKind !== null;
  const area = measureKind === "area" ? geodesicArea(measurePoints) : 0;
  const length = map && measureKind === "distance" ? pathLength(map, measurePoints) : 0;

  return (
    <div className="map-toolbar-wrap">
      <div className="map-toolbar" role="toolbar" aria-label="地圖工具">
        <div className="map-toolbar-group">
          <button type="button" className={layersOpen ? "active" : ""} onClick={onToggleLayers} title="圖層" aria-pressed={layersOpen}>
            <Layers size={20} />
          </button>
          <button type="button" onClick={() => map?.zoomIn()} title="放大">
            <Plus size={20} />
          </button>
          <button type="button" onClick={() => map?.zoomOut()} title="縮小">
            <Minus size={20} />
          </button>
          <button type="button" onClick={onLocate} disabled={isLocating} title={isLocating ? "正在定位中..." : "定位目前位置"}>
            {isLocating ? <span className="locate-spinner" /> : <Locate size={20} />}
          </button>
        </div>
        <div className="map-toolbar-group">
          <button type="button" onClick={() => map?.flyToBounds(GUANGFU_BOUNDS, { duration: 1.2 })} title="回到光復鄉">
            <House size={20} />
          </button>
          <button
            type="button"
            className={measuring ? "active" : ""}
            onClick={() => {
              if (!measuring) map?.closePopup();
              onMeasureKindChange(measuring ? null : "distance");
            }}
            title="測量距離與面積"
            aria-pressed={measuring}
          >
            <Ruler size={20} />
          </button>
        </div>
      </div>

      {measuring && (
        <div className="measure-panel" role="region" aria-label="測量">
          <div className="measure-panel-head">
            <strong>測量</strong>
            <button type="button" className="measure-close" onClick={() => onMeasureKindChange(null)} title="結束測量">
              <X size={16} />
            </button>
          </div>
          <div className="measure-tabs">
            <button type="button" className={measureKind === "distance" ? "active" : ""} onClick={() => onMeasureKindChange("distance")}>
              距離
            </button>
            <button type="button" className={measureKind === "area" ? "active" : ""} onClick={() => onMeasureKindChange("area")}>
              面積
            </button>
          </div>
          <p className="measure-hint">
            {measureDone ? "已完成。點地圖可重新測量。" : "在地圖上依序點選，雙擊結束。"}
          </p>
          <div className="measure-result">
            {measureKind === "distance" ? (
              measurePoints.length < 2 ? (
                <span className="measure-hint">至少點 2 個點</span>
              ) : (
                <span className="measure-value">{formatDistance(length)}</span>
              )
            ) : measurePoints.length < 3 ? (
              <span className="measure-hint">至少點 3 個頂點</span>
            ) : (
              <>
                <span className="measure-value">{formatArea(area)}</span>
                <span className="measure-sub">{formatAreaSub(area)}</span>
              </>
            )}
          </div>
          <button type="button" className="measure-clear" onClick={onClearMeasure} disabled={measurePoints.length === 0}>
            清除，重新測量
          </button>
        </div>
      )}
    </div>
  );
}
