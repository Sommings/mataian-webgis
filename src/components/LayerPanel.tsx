import { X } from "lucide-react";

export type LayerOption = {
  id: string;
  name: string;
  group?: "map" | "pre" | "post";
  /** 圖例：線或面的顏色與樣式，讓圖層不只靠顏色區分 */
  legend?: { color: string; fill?: string; dashed?: boolean };
};

// 基本底圖分組：災前、災後以 2025/9/23 堰塞湖溢流為界
const BASE_GROUPS: { id: NonNullable<LayerOption["group"]>; label: string; tag?: string }[] = [
  { id: "map", label: "地圖" },
  { id: "pre", label: "災前影像", tag: "災前" },
  { id: "post", label: "災後影像", tag: "災後" },
];

export type OverlayState = Record<string, { on: boolean; transparency: number }>;

type LayerPanelProps = {
  baseLayers: LayerOption[];
  activeBase: string;
  onBaseChange: (id: string) => void;
  overlays: LayerOption[];
  overlayState: OverlayState;
  onToggleOverlay: (id: string, on: boolean) => void;
  onTransparencyChange: (id: string, transparency: number) => void;
  onClose: () => void;
};

/** 右側圖層面板：基本底圖擇一，額外圖層可多選並調整透明度 */
export default function LayerPanel({
  baseLayers,
  activeBase,
  onBaseChange,
  overlays,
  overlayState,
  onToggleOverlay,
  onTransparencyChange,
  onClose,
}: LayerPanelProps) {
  return (
    <section className="layer-panel" aria-label="圖層">
      <header className="layer-panel-head">
        <h2>圖層</h2>
        <button type="button" onClick={onClose} title="關閉圖層">
          <X size={18} />
        </button>
      </header>

      <div className="layer-panel-body">
        <h3>基本底圖</h3>
        <p className="layer-note">災前、災後以 2025/9/23 馬太鞍溪堰塞湖溢流為界</p>
        {BASE_GROUPS.map((group) => (
          <div key={group.id} className="layer-group">
            <h4>
              {group.tag && <span className={`layer-tag ${group.id}`}>{group.tag}</span>}
              {group.label}
            </h4>
            <ul className="layer-list">
              {baseLayers
                .filter((layer) => (layer.group ?? "map") === group.id)
                .map((layer) => (
                  <li key={layer.id} className={activeBase === layer.id ? "on" : ""}>
                    <label className="layer-row">
                      <input
                        type="radio"
                        name="base-layer"
                        id={`base-${layer.id}`}
                        checked={activeBase === layer.id}
                        onChange={() => onBaseChange(layer.id)}
                      />
                      <span>{layer.name}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        ))}

        <h3>額外圖層</h3>
        <ul className="layer-list">
          {overlays.map((layer) => {
            const state = overlayState[layer.id];
            return (
              <li key={layer.id} className={state.on ? "on" : ""}>
                <label className="layer-row">
                  <input
                    type="checkbox"
                    id={`overlay-${layer.id}`}
                    checked={state.on}
                    onChange={(e) => onToggleOverlay(layer.id, e.target.checked)}
                  />
                  <span>{layer.name}</span>
                  {layer.legend && (
                    <span
                      className={`layer-legend${layer.legend.fill ? "" : " line"}${layer.legend.dashed ? " dashed" : ""}`}
                      style={{ borderColor: layer.legend.color, background: layer.legend.fill ?? "transparent" }}
                      aria-hidden="true"
                    />
                  )}
                </label>
                <div className="layer-opacity">
                  <input
                    type="range"
                    id={`opacity-${layer.id}`}
                    min={0}
                    max={100}
                    step={5}
                    value={state.transparency}
                    disabled={!state.on}
                    aria-label={`${layer.name}透明度`}
                    onChange={(e) => onTransparencyChange(layer.id, Number(e.target.value))}
                  />
                  <output htmlFor={`opacity-${layer.id}`}>透明度 {state.transparency}%</output>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
