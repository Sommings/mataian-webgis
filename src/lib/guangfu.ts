import type { LatLngBoundsExpression } from "leaflet";

// 光復鄉範圍（內政部鄉鎮市區界線 1140318 的外框），地圖開啟時與「回到光復鄉」都用這個範圍
export const GUANGFU_BOUNDS: LatLngBoundsExpression = [
  [23.5847, 121.3581],
  [23.713, 121.525],
];
