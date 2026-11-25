import type { StoryRegion } from "../types/story";
import regions from "../data/storyRegions.json";

export const STORY_REGIONS = regions as StoryRegion[];

/** 照片路徑：完整網址直接用，相對路徑接在網站根目錄後面 */
export const storyPhotoSrc = (src: string) =>
  /^https?:\/\//.test(src) ? src : `${import.meta.env.BASE_URL}${src}`;

/** 桌機的故事面板寬度（含左側間距），地圖置中時要扣掉 */
export const STORY_PANEL_WIDTH = 432;
