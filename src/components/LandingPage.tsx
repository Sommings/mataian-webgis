import { useState } from "react";
import { ChevronDown, ClipboardList, Map, MapPin, BookOpen } from "lucide-react";

type LandingPageProps = {
  onEnterGeneral: () => void;
  onEnterInstant: () => void;
  reportCount: number;
};

const FAQ_LIST = [
  {
    q: "本專案的發起目的是什麼？",
    a: "馬太鞍溪上游因地質敏感及豪雨影響，多次形成堰塞湖，對下游部落帶來極大安全隱憂。政大國土服務團發起「參與式地圖災情回報系統」，期望透過社群群眾外包（Crowdsourcing）的力量，讓居民在遭遇積淹水、泥沙淤積或建物受損時，能第一時間定位上報，建立起屬於部落自己的防災安全圖資庫。",
  },
  {
    q: "我的個人隱私會外洩嗎？個資安全嗎？",
    a: "請絕對放心！本平台採用「去識別化/匿名」設計。在地圖上公開展示的資料僅包含「受災類型」、「積水與淤泥高度描述」及「現場照片」，不會公開您的真實姓名或電話。系統在送出前會提供完整的個資宣告聲明，全力守護您的資訊隱私。",
  },
  {
    q: "我如果不在現場，可以幫忙回報嗎？",
    a: "可以！只要您有獲得部落親友的確切受災照片與位置描述，您可以在地圖選點時，將點位精準定位在受災親友的房舍或農地上，並在描述中說明狀況，同樣能為部落共創防災圖資貢獻一份力量。",
  },
];

/** 「關於」頁：專案緣起、功能介紹、常見問題與團隊介紹（樣式依《視覺設計指南》） */
export default function LandingPage({ onEnterGeneral, onEnterInstant, reportCount }: LandingPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div className="about-page">
      <nav className="about-nav">
        <span className="about-nav-title">花蓮馬太鞍溪堰塞湖災害參與式地圖</span>
        <a href="https://www.facebook.com/NCCULUPMCLUB/" target="_blank" rel="noopener noreferrer">
          政大國土服務團
        </a>
      </nav>

      <header className="about-hero">
        <div className="about-inner">
          <p className="about-eyebrow">地圖緣起與介紹</p>
          <h1>
            從地圖看見
            <br />
            災後土地與生活的課題
          </h1>
          <p>
            2025 年 9 月 23 日，馬太鞍溪堰塞湖溢流事件造成光復鄉及周邊地區災害影響，且直至目前並無一套能整合實際受災範圍、家戶現況、土地與建物資訊，以及災後復原需求的地圖工具。
          </p>
          <p>
            因此，我們希望透過這個系統，讓居民與相關單位能以地圖方式記錄災情、整理空間資訊，並作為後續災後重建、復原規劃與公共討論的基礎。
          </p>
          <div className="about-actions">
            <button type="button" className="about-btn primary" onClick={onEnterGeneral}>
              進入一般災情填報
            </button>
            <button type="button" className="about-btn" onClick={onEnterInstant}>
              進入即時災情填報
            </button>
          </div>
          <p className="about-count">
            社群累計共創 <strong>{reportCount}</strong> 筆災情
          </p>
        </div>
      </header>

      <main className="about-main">
        <div className="about-inner about-main-inner">
        <section>
          <h2>這個系統可以做什麼？</h2>
          <div className="about-cards">
            <article className="about-card">
              <Map size={22} />
              <h3>查詢模式</h3>
              <p>瀏覽災前、災後的衛星影像與航照，疊加堤防用地範圍、治理計畫線、原住民保留地與地籍等圖層，並可測量距離與面積。</p>
            </article>
            <article className="about-card">
              <ClipboardList size={22} />
              <h3>回報災情</h3>
              <p>
                <strong>一般災情填報</strong>：可填寫土地、建物、使用現況、受災程度、淹水高度、泥砂堆積等災後資訊，協助建立受災家戶與土地建物資料庫。
              </p>
              <p>
                <strong>即時災情填報</strong>：可回報道路中斷、積水、危險區域、災情嚴重或不建議靠近的地點與範圍，提醒其他使用者注意安全。
              </p>
              <p className="about-card-note">
                <MapPin size={14} />
                兩種回報都可以標記單一地點，或在地圖上圈出受災範圍。
              </p>
            </article>
            <article className="about-card">
              <BookOpen size={22} />
              <h3>故事地圖</h3>
              <p>介紹馬太鞍溪流域九個區域的災害與土地課題，每區附照片、資料來源與延伸閱讀。</p>
            </article>
          </div>
          <p className="about-callout">
            這些資料將作為後續空間盤點、災後復原討論、部落與政府溝通，以及參與式 GIS 工作坊的重要基礎。
          </p>
        </section>

        <section>
          <h2>常見問與答</h2>
          <div className="about-faq">
            {FAQ_LIST.map((faq, index) => {
              const open = openFaqIndex === index;
              return (
                <div key={faq.q} className={`about-faq-item${open ? " open" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaqIndex(open ? null : index)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} />
                  </button>
                  {open && <p>{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
        </div>
      </main>

      <footer className="about-team">
        <div className="about-inner">
          <p className="about-eyebrow">關於我們</p>
          <h2>政大國土服務團</h2>
          <p>我們是來自政治大學的學生社團，我們致力於將學術所學投入社會實踐，希望為部落的土地與安全盡一份心力。</p>
          <p className="about-meta">
            系統版本 v2.0（地圖優先改版）｜最後更新：2026-11-25｜開發團隊：
            <a href="https://www.facebook.com/NCCULUPMCLUB/" target="_blank" rel="noopener noreferrer">
              政大國土服務團
            </a>{" "}
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
