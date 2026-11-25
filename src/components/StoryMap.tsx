import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, ImageOff, Play, X, ZoomIn } from "lucide-react";
import type { StoryLink, StoryPhoto, StoryRegion } from "../types/story";
import { STORY_PANEL_WIDTH, storyPhotoSrc } from "../lib/story";

export type OpenPhoto = (photos: StoryPhoto[], index: number) => void;

const isNarrow = () => window.innerWidth <= 980;

// 手機版故事面板從下方拉起，約佔地圖高度的一半
const sheetHeight = (map: L.Map) => Math.round(map.getSize().y * 0.5);

// 縮小到這個層級以下，標籤只顯示編號，避免九個區域的名稱疊在一起
const COMPACT_MAX_ZOOM = 12;

// 地圖上的區域照片最多顯示幾張縮圖
const MAP_THUMBS = 4;

const metersPerPixel = (lat: number, zoom: number) =>
  (40075016.686 * Math.cos((lat * Math.PI) / 180)) / 2 ** (zoom + 8);

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function regionLabelHtml(region: StoryRegion, no: number, selected: boolean, zoom: number) {
  // 光暈直徑依區域半徑換算成目前縮放層級的像素，代表實際範圍
  const size = Math.min(1200, Math.max(36, (2 * region.radius) / metersPerPixel(region.lat, zoom)));
  const local = region.nameLocal ? `<strong>${escapeHtml(region.nameLocal)}</strong>` : "";
  return `<div class="story-pin side-${region.labelSide}${selected ? " selected" : ""}">
    <span class="story-glow" style="width:${size}px;height:${size}px;left:${-size / 2}px;top:${-size / 2}px"></span>
    <span class="story-label">${local}<span>${escapeHtml(region.nameZh)}</span></span>
    <span class="story-no">${no}</span>
  </div>`;
}

// 縮圖條放在標籤的另一側，不會擋住名稱
const OPPOSITE: Record<StoryRegion["labelSide"], StoryRegion["labelSide"]> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function thumbsHtml(region: StoryRegion, photos: StoryPhoto[]) {
  const shown = photos.slice(0, MAP_THUMBS);
  const more = photos.length - shown.length;
  const items = shown
    .map(
      (p, i) =>
        `<button type="button" class="story-thumb" data-index="${i}" title="${escapeHtml(p.caption)}">` +
        `<img src="${escapeHtml(storyPhotoSrc(p.src))}" alt="${escapeHtml(p.caption)}" referrerpolicy="no-referrer"></button>`
    )
    .join("");
  const moreHtml = more > 0 ? `<button type="button" class="story-thumb more" data-index="${MAP_THUMBS}">+${more}</button>` : "";
  return `<div class="story-thumbs side-${OPPOSITE[region.labelSide]}">${items}${moreHtml}</div>`;
}

/** 記錄每張照片能不能載入：回傳載得到的照片，以及確定載不到的張數 */
function useLoadablePhotos(photos: StoryPhoto[]) {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const requested = useRef(new Set<string>());
  useEffect(() => {
    for (const p of photos) {
      if (requested.current.has(p.src)) continue;
      requested.current.add(p.src);
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () => setStatus((prev) => ({ ...prev, [p.src]: true }));
      img.onerror = () => setStatus((prev) => ({ ...prev, [p.src]: false }));
      img.src = storyPhotoSrc(p.src);
    }
  }, [photos]);
  return {
    loaded: photos.filter((p) => status[p.src]),
    missing: photos.filter((p) => status[p.src] === false).length,
    pending: photos.some((p) => !(p.src in status)),
  };
}

/** 地圖上的區域範圍與標籤，需放在 MapContainer 裡 */
export function StoryLayer({
  regions,
  selectedId,
  onSelect,
  onOpenPhoto,
}: {
  regions: StoryRegion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenPhoto: OpenPhoto;
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
            html: regionLabelHtml(r, i + 1, r.id === selectedId, zoom),
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
        ])
      ),
    [regions, selectedId, zoom]
  );

  const selected = regions.find((r) => r.id === selectedId) ?? null;
  const selectedPhotos = useLoadablePhotos(selected?.photos ?? []).loaded;

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
    if (!selected) return;
    const zoomTo = 15;
    const point = map.project([selected.lat, selected.lng], zoomTo);
    const offset = isNarrow() ? L.point(0, sheetHeight(map) / 2) : L.point(-STORY_PANEL_WIDTH / 2, 0);
    map.flyTo(map.unproject(point.add(offset), zoomTo), zoomTo, { duration: 1.2 });
  }, [map, selected]);

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
      {selected && selectedPhotos.length > 0 && (
        <Marker
          key={`thumbs-${selected.id}`}
          position={[selected.lat, selected.lng]}
          zIndexOffset={2000}
          keyboard={false}
          icon={L.divIcon({
            className: "story-thumbs-marker",
            html: thumbsHtml(selected, selectedPhotos),
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
          eventHandlers={{
            click: (e) => {
              const target = (e.originalEvent.target as HTMLElement).closest<HTMLElement>("[data-index]");
              if (target) onOpenPhoto(selectedPhotos, Math.min(Number(target.dataset.index), selectedPhotos.length - 1));
            },
          }}
        />
      )}
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

/** 只輪播載得到的照片；團隊照片還沒放進網站的，在下方註明張數 */
function PhotoViewer({ photos: allPhotos, onOpenPhoto }: { photos: StoryPhoto[]; onOpenPhoto: OpenPhoto }) {
  const [index, setIndex] = useState(0);
  const { loaded: photos, missing, pending } = useLoadablePhotos(allPhotos);
  const missingNote = missing > 0 && <p className="story-photo-note">另有 {missing} 張照片待上傳</p>;
  if (photos.length === 0) {
    return (
      <>
        <div className="story-photo-empty">
          <ImageOff size={20} />
          <span>{pending ? "照片載入中" : "本區照片待補充"}</span>
        </div>
        {missingNote}
      </>
    );
  }
  const photo = photos[Math.min(index, photos.length - 1)];
  return (
    <figure className="story-photos">
      <div className="story-photo-frame">
        <button type="button" className="story-photo-open" onClick={() => onOpenPhoto(photos, photos.indexOf(photo))} title="放大照片">
          <img key={photo.src} src={storyPhotoSrc(photo.src)} alt={photo.caption} referrerPolicy="no-referrer" />
          <span className="story-photo-zoom">
            <ZoomIn size={16} />
            點擊放大
          </span>
        </button>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="story-photo-nav prev"
              onClick={() => setIndex((photos.indexOf(photo) - 1 + photos.length) % photos.length)}
              aria-label="上一張"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="story-photo-nav next"
              onClick={() => setIndex((photos.indexOf(photo) + 1) % photos.length)}
              aria-label="下一張"
            >
              <ChevronRight size={20} />
            </button>
            <span className="story-photo-count">
              {photos.indexOf(photo) + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <figcaption>
        <span className="story-caption">{photo.caption}</span>
        <PhotoCredit photo={photo} />
        {missingNote}
      </figcaption>
    </figure>
  );
}

const youtubeId = (url: string) =>
  url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;

function LinkCard({ link }: { link: StoryLink }) {
  const [broken, setBroken] = useState(false);
  const videoId = youtubeId(link.url);
  const thumb = link.thumbnail ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
  return (
    <a className="story-link" href={link.url} target="_blank" rel="noopener noreferrer">
      <span className="story-link-thumb">
        {thumb && !broken ? (
          <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        ) : (
          <ExternalLink size={20} />
        )}
        {videoId && (
          <span className="story-link-play">
            <Play size={16} />
          </span>
        )}
      </span>
      <span className="story-link-text">
        <span className="story-link-title">{link.title}</span>
        <span className="story-link-source">
          {link.source}
          {videoId ? "・影片" : ""}
        </span>
      </span>
    </a>
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
  onOpenPhoto,
}: {
  regions: StoryRegion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenPhoto: OpenPhoto;
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
            <PhotoViewer key={region.id} photos={region.photos} onOpenPhoto={onOpenPhoto} />
            {region.sections.map((section) => (
              <section key={section.heading} className="story-section">
                <h4>{section.heading}</h4>
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
            <p className="story-sources">資料來源：{region.sources.join("；")}</p>

            {region.links.length > 0 && (
              <section className="story-links">
                <h4>延伸閱讀</h4>
                {region.links.map((link) => (
                  <LinkCard key={link.url} link={link} />
                ))}
              </section>
            )}

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
              2025 年 9 月 23 日馬太鞍溪堰塞湖溢流後，流域內九個區域面臨不同的災害與土地課題。點選地圖上的範圍或下方清單，閱讀各區的故事。
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

/** 照片放大檢視：左右切換、Esc 或點背景關閉 */
export function StoryLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: StoryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const go = (step: number) => onIndexChange((index + step + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  return (
    <div className="story-lightbox" role="dialog" aria-modal="true" aria-label={photo.caption} onClick={onClose}>
      <button type="button" className="story-lightbox-close" onClick={onClose} aria-label="關閉">
        <X size={22} />
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={storyPhotoSrc(photo.src)} alt={photo.caption} referrerPolicy="no-referrer" />
        <figcaption>
          <span className="story-caption">{photo.caption}</span>
          <PhotoCredit photo={photo} />
          {photos.length > 1 && (
            <span className="story-lightbox-count">
              {index + 1} / {photos.length}
            </span>
          )}
        </figcaption>
      </figure>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="story-lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="上一張"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            className="story-lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="下一張"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}
    </div>
  );
}
