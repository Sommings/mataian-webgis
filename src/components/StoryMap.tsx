import { useEffect, useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImageOff } from "lucide-react";
import type { StoryPhoto, StoryRegion } from "../types/story";
import { STORY_PANEL_WIDTH, storyPhotoSrc } from "../lib/story";

const isNarrow = () => window.innerWidth <= 980;

// 手機版故事面板從下方拉起，約佔地圖高度的一半
const sheetHeight = (map: L.Map) => Math.round(map.getSize().y * 0.5);

// 縮小到這個層級以下，標籤改成只顯示編號圓點，避免九個區域的名稱疊在一起
const COMPACT_MAX_ZOOM = 12;

function regionLabelHtml(region: StoryRegion, no: number, selected: boolean) {
  const local = region.nameLocal ? `<strong>${region.nameLocal}</strong>` : "";
  return `<div class="story-pin side-${region.labelSide}${selected ? " selected" : ""}">
    <span class="story-glow"></span>
    <span class="story-dot"><span class="story-no">${no}</span></span>
    <span class="story-label">${local}<span>${region.nameZh}</span></span>
  </div>`;
}

/** 地圖上的區域標籤，需放在 MapContainer 裡 */
export function StoryLayer({
  regions,
  selectedId,
  onSelect,
}: {
  regions: StoryRegion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle("story-compact", zoom <= COMPACT_MAX_ZOOM);
    return () => container.classList.remove("story-compact");
  }, [map, zoom]);

  const icons = useMemo(
    () =>
      Object.fromEntries(
        regions.map((r, i) => [
          r.id,
          L.divIcon({
            className: "story-marker",
            html: regionLabelHtml(r, i + 1, r.id === selectedId),
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
        ])
      ),
    [regions, selectedId]
  );

  // 進入故事地圖時，把所有區域放進畫面（扣掉故事面板佔的位置）
  useEffect(() => {
    const bounds = L.latLngBounds(regions.map((r) => [r.lat, r.lng] as [number, number]));
    const narrow = isNarrow();
    map.flyToBounds(bounds, {
      paddingTopLeft: [narrow ? 40 : STORY_PANEL_WIDTH + 60, 80],
      paddingBottomRight: [narrow ? 70 : 100, narrow ? sheetHeight(map) + 40 : 60], // 右側留給工具列
      duration: 1,
    });
  }, [map, regions]);

  // 選到區域時飛過去，並讓它落在面板以外的可見範圍中央
  useEffect(() => {
    const region = regions.find((r) => r.id === selectedId);
    if (!region) return;
    const zoom = 15;
    const point = map.project([region.lat, region.lng], zoom);
    const offset = isNarrow() ? L.point(0, sheetHeight(map) / 2) : L.point(-STORY_PANEL_WIDTH / 2, 0);
    map.flyTo(map.unproject(point.add(offset), zoom), zoom, { duration: 1.2 });
  }, [map, regions, selectedId]);

  return (
    <>
      {regions.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={icons[r.id]}
          title={r.nameLocal ? `${r.nameLocal} ${r.nameZh}` : r.nameZh}
          zIndexOffset={r.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(r.id) }}
        />
      ))}
    </>
  );
}

function PhotoCredit({ photo }: { photo: StoryPhoto }) {
  const { credit } = photo;
  return (
    <span className="story-credit">
      圖片來源：
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer">
          {credit.name}
          {credit.title && `〈${credit.title}〉`}
        </a>
      ) : (
        credit.name
      )}
    </span>
  );
}

function PhotoViewer({ photos }: { photos: StoryPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  if (photos.length === 0) {
    return (
      <div className="story-photo-empty">
        <ImageOff size={20} />
        <span>本區照片待補充</span>
      </div>
    );
  }
  const photo = photos[index];
  return (
    <figure className="story-photos">
      <div className="story-photo-frame">
        {failed[index] ? (
          <div className="story-photo-missing">
            <ImageOff size={24} />
            {photo.credit.url ? (
              <a href={photo.credit.url} target="_blank" rel="noopener noreferrer">
                無法直接顯示，請至原始報導查看
              </a>
            ) : (
              <span>照片待上傳</span>
            )}
          </div>
        ) : (
          <img
            key={photo.src}
            src={storyPhotoSrc(photo.src)}
            alt={photo.caption}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed((prev) => ({ ...prev, [index]: true }))}
          />
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="story-photo-nav prev"
              onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
              aria-label="上一張"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="story-photo-nav next"
              onClick={() => setIndex((index + 1) % photos.length)}
              aria-label="下一張"
            >
              <ChevronRight size={20} />
            </button>
            <span className="story-photo-count">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <figcaption>
        <span className="story-caption">{photo.caption}</span>
        <PhotoCredit photo={photo} />
      </figcaption>
    </figure>
  );
}

function RegionName({ region }: { region: StoryRegion }) {
  return (
    <span className="story-tag">
      {region.nameLocal && <strong>{region.nameLocal}</strong>}
      <span>{region.nameZh}</span>
    </span>
  );
}

/** 故事地圖的左側面板（手機為下方抽屜）：區域清單與區域故事 */
export function StoryPanel({
  regions,
  selectedId,
  onSelect,
}: {
  regions: StoryRegion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  // 手機版收合狀態只對當下的畫面有效，換區域就自動展開
  const viewKey = selectedId ?? "list";
  const [collapsedView, setCollapsedView] = useState<string | null>(null);
  const collapsed = collapsedView === viewKey;
  const index = regions.findIndex((r) => r.id === selectedId);
  const region = index >= 0 ? regions[index] : null;
  const prev = index > 0 ? regions[index - 1] : null;
  const next = index >= 0 && index < regions.length - 1 ? regions[index + 1] : null;

  // 換區域時回到面板頂端
  useEffect(() => {
    document.querySelector(".story-panel-body")?.scrollTo({ top: 0 });
  }, [selectedId]);

  return (
    <aside className={`story-panel${collapsed ? " collapsed" : ""}`} aria-label="故事地圖">
      <header className="story-panel-head">
        {region ? (
          <button type="button" className="story-back" onClick={() => onSelect(null)}>
            <ArrowLeft size={16} />
            所有區域
          </button>
        ) : (
          <h2>故事地圖</h2>
        )}
        <button
          type="button"
          className="story-collapse"
          onClick={() => setCollapsedView(collapsed ? null : viewKey)}
          aria-label={collapsed ? "展開" : "收合"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </header>

      <div className="story-panel-body">
        {region ? (
          <article className="story-article">
            <RegionName region={region} />
            <h3 className="story-title">{region.title}</h3>
            <PhotoViewer key={region.id} photos={region.photos} />
            {region.sections.map((section) => (
              <section key={section.heading} className="story-section">
                <h4>{section.heading}</h4>
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
            <p className="story-sources">資料來源：{region.sources.join("；")}</p>

            <nav className="story-pager" aria-label="切換區域">
              {prev ? (
                <button type="button" onClick={() => onSelect(prev.id)}>
                  <ChevronLeft size={16} />
                  <span>{prev.nameLocal ?? prev.nameZh}</span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button type="button" className="next" onClick={() => onSelect(next.id)}>
                  <span>{next.nameLocal ?? next.nameZh}</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </nav>
          </article>
        ) : (
          <>
            <p className="story-intro">
              2025 年 9 月 23 日馬太鞍溪堰塞湖溢流後，流域內九個區域面臨不同的災害與土地課題。點選地圖上的標籤或下方清單，閱讀各區的故事。
            </p>
            <ol className="story-list">
              {regions.map((r, i) => (
                <li key={r.id}>
                  <button type="button" onClick={() => onSelect(r.id)}>
                    <span className="story-list-no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="story-list-text">
                      <RegionName region={r} />
                      <span className="story-list-title">{r.title}</span>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </aside>
  );
}
