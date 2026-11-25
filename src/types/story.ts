// 故事地圖的區域資料，內容放在 src/data/storyRegions.json

export type StoryPhotoCredit = {
  /** 來源名稱，例如媒體或拍攝單位 */
  name: string;
  /** 原始報導標題（引用媒體照片時填寫） */
  title?: string;
  /** 原始報導網址 */
  url?: string;
};

export type StoryPhoto = {
  caption: string;
  /** 完整網址，或相對於網站根目錄的路徑（例如 story/photos/fataan-1.jpg） */
  src: string;
  credit: StoryPhotoCredit;
};

export type StorySection = {
  heading: string;
  paragraphs: string[];
};

export type StoryRegion = {
  id: string;
  /** 族語名稱，沒有就留 null */
  nameLocal: string | null;
  nameZh: string;
  title: string;
  lat: number;
  lng: number;
  /** 地圖上標籤放在點的哪一側，避免相鄰區域重疊 */
  labelSide: "top" | "bottom" | "left" | "right";
  sections: StorySection[];
  /** 文案依據的文件 */
  sources: string[];
  photos: StoryPhoto[];
  /** 給編輯者看的備註，不會顯示在網站上 */
  editorNote?: string;
};
