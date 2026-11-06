// 用網站的門牌資料庫（public/address_db.json）把長輩說的地址換成座標。
// 比對方式和 MapView 的地址搜尋相同；找不到完整門牌時退回到村里中心點。

import type { GeoMatch } from "./conversation.ts";

export interface AddressPoint {
  a: string; // 完整地址，例如「花蓮縣光復鄉大全村中山路一段１號」
  x: number; // 經度
  y: number; // 緯度
}

export function normalizeAddress(addr: string): string {
  return addr
    .replace(/臺/g, "台")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "");
}

const TOWNSHIPS = ["光復鄉", "鳳林鎮", "萬榮鄉", "瑞穗鄉"];

export function geocode(db: AddressPoint[], query: string): GeoMatch | null {
  const norm = normalizeAddress(query).replace(/[，。,.！!？?]/g, "");
  if (!norm) return null;

  const core = norm.replace(/花蓮縣/g, "").replace(new RegExp(TOWNSHIPS.join("|"), "g"), "");
  const township = TOWNSHIPS.find((t) => norm.includes(t));
  const entries = indexed(db).filter((e) => !township || e.norm.includes(township));

  // 1. 門牌：要有路名或號，避免只說「大全村」就隨便挑一戶。
  //    說話常有「我家住在…」這類開頭，逐字去掉前綴再比對。
  if (/[路街巷弄號]/.test(core)) {
    for (let cut = 0; cut <= Math.min(8, core.length - 4); cut++) {
      const part = core.slice(cut);
      if (!/[一-鿿][路街]/.test(part)) break; // 路名被切掉就不再比，避免配到別條路的同號
      const hit = entries.find((e) => e.norm.includes(part));
      if (hit) return { lat: hit.p.y, lng: hit.p.x, matched: hit.p.a, precision: "address" };
    }
  }

  // 2. 村里：資料庫裡有的村里名稱出現在句子裡，就取該村所有門牌的平均位置
  const village = [...new Set(entries.map((e) => e.village).filter(Boolean))]
    .find((v) => core.includes(v!));
  if (village) {
    const pts = entries.filter((e) => e.village === village);
    const lat = pts.reduce((s, e) => s + e.p.y, 0) / pts.length;
    const lng = pts.reduce((s, e) => s + e.p.x, 0) / pts.length;
    return { lat, lng, matched: `${pts[0].township}${village}`, precision: "village" };
  }

  return null;
}

interface Indexed {
  p: AddressPoint;
  norm: string;
  township: string;
  village: string | undefined;
}

const indexCache = new WeakMap<AddressPoint[], Indexed[]>();

function indexed(db: AddressPoint[]): Indexed[] {
  let idx = indexCache.get(db);
  if (!idx) {
    idx = db.map((p) => {
      const norm = normalizeAddress(p.a);
      const m = norm.match(/([一-鿿]{2}[鄉鎮])([一-鿿]{2}[村里])/);
      return { p, norm, township: m?.[1] ?? "", village: m?.[2] };
    });
    indexCache.set(db, idx);
  }
  return idx;
}

let cached: AddressPoint[] | null = null;

/** 從上線網站抓門牌資料庫，同一個 Edge Function 執行個體只抓一次 */
export async function loadAddressDb(url: string): Promise<AddressPoint[]> {
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`門牌資料庫下載失敗：HTTP ${res.status}`);
  cached = (await res.json()) as AddressPoint[];
  return cached;
}
