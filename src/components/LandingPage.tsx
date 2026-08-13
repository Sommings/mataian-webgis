import { useState, useEffect } from "react";
import { 
  CloudLightning, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  Users,
  AlertTriangle,
  ClipboardList
} from "lucide-react";

type LandingPageProps = {
  onEnterGeneral: () => void;
  onEnterInstant: () => void;
  reportCount: number;
};

export default function LandingPage({ 
  onEnterGeneral, 
  onEnterInstant, 
  reportCount 
}: LandingPageProps) {
  // 控制 FAQ 展開狀態的手風琴 State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // 響應式視窗寬度 State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqList = [
    {
      q: "💡 本專案的發起目的是什麼？",
      a: "馬太鞍溪上游因地質敏感及豪雨影響，多次形成堰塞湖，對下游部落帶來極大安全隱憂。政大國土服務團發起「參與式地圖災情回報系統」，期望透過社群群眾外包（Crowdsourcing）的力量，讓居民在遭遇積淹水、泥沙淤積或建物受損時，能第一時間定位上報，建立起屬於部落自己的防災安全圖資庫。"
    },
    {
      q: "🛡️ 我的個人隱私會外洩嗎？個資安全嗎？",
      a: "請絕對放心！本平台採用「去識別化/匿名」設計。在地圖上公開展示的資料僅包含「受災類型」、「積水與淤泥高度描述」及「現場照片」，不會公開您的真實姓名或電話。系統在送出前會提供完整的個資宣告聲明，全力守護您的資訊穩私。"
    },
    {
      q: "📍 我如果不在現場，可以幫忙回報嗎？",
      a: "可以！只要您有獲得部落親友的確切受災照片與位置描述，您可以在地圖選點時，將點位精準定位在受災親友的房舍或農地上，並在描述中說明狀況，同樣能為部落共創防災圖資貢獻一份力量。"
    }
  ];

  return (
    <div
      style={{
        fontFamily: "'Outfit', 'Inter', 'Noto Sans TC', sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        color: "#1e293b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 60px 0",
        boxSizing: "border-box",
      }}
    >
      {/* 1. 頂部導覽列 Navbar (包含最上面的地圖名稱，適配居中與響應式排版) */}
      <nav
        style={{
          width: "100%",
          maxWidth: "1200px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: isMobile ? "center" : "space-between",
          alignItems: "center",
          padding: "20px 24px",
          gap: isMobile ? "14px" : "0px",
          boxSizing: "border-box",
          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
          position: "relative"
        }}
      >
        {/* 左側 Logo 圖標 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
            }}
          >
            <Compass size={20} />
          </div>
        </div>

        {/* 中間地圖名稱 (桌機完美居中，手機自動排列置中) */}
        <div
          style={isMobile ? {
            textAlign: "center"
          } : {
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            pointerEvents: "none"
          }}
        >
          <span 
            style={{ 
              fontSize: "17px", 
              fontWeight: 850, 
              color: "#1e3a8a", 
              letterSpacing: "0.02em", 
              lineHeight: 1.3,
              whiteSpace: isMobile ? "normal" : "nowrap"
            }}
          >
            花蓮馬太鞍溪堰塞湖災害參與式地圖
          </span>
        </div>

        {/* 右側政大國土服務團連結 */}
        <a
          href="https://www.facebook.com/NCCULUPMCLUB/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#2563eb",
            textDecoration: "none",
            border: "1.5px solid #2563eb",
            padding: "6px 14px",
            borderRadius: "20px",
            transition: "all 0.2s",
            backgroundColor: "transparent",
            whiteSpace: "nowrap"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#eff6ff";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          政大國土服務團
        </a>
      </nav>

      {/* 2. Hero 區塊 (地圖緣起與介紹) */}
      <header
        style={{
          width: "100%",
          maxWidth: "900px",
          textAlign: "center",
          padding: "50px 24px 30px 24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#dbeafe",
            color: "#1e40af",
            padding: "6px 14px",
            borderRadius: "30px",
            fontSize: "13px",
            fontWeight: 700,
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
          }}
        >
          <CloudLightning size={14} />
          <span>地圖緣起與介紹</span>
        </div>

        {/* 精美玻璃質感緣起卡片 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            padding: "30px 35px",
            borderRadius: "24px",
            boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.05)",
            textAlign: "justify",
            maxWidth: "800px",
            marginBottom: "35px",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              color: "#334155",
              lineHeight: 1.8,
              margin: "0 0 16px 0",
              fontWeight: 500,
              textIndent: "32px"
            }}
          >
            2025 年 9 月 23 日，馬太鞍溪堰塞湖溢流事件造成光復鄉及周邊地區災害影響，且直至目前並無一套能整合實際受災範圍、家戶現況、土地與建物資訊，以及災後復原需求的地圖工具。
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "#334155",
              lineHeight: 1.8,
              margin: 0,
              fontWeight: 500,
              textIndent: "32px"
            }}
          >
            因此，我們希望透過這個系統，讓居民與相關單位能以地圖方式記錄災情、整理空間資訊，並作為後續災後重建、復原規劃與公共討論的基礎。
          </p>
        </div>

        {/* 雙按鈕通道與累計統計 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
          
          {/* 雙按鈕並列 */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
            
            {/* 1. 一般災情填報按鈕 */}
            <button
              onClick={onEnterGeneral}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                padding: "18px 36px",
                borderRadius: "40px",
                fontSize: "17px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease-in-out",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#1d4ed8";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span>📋 進入一般災情填報</span>
              <span style={{ fontSize: "18px" }}>➔</span>
            </button>

            {/* 2. 即時災情填報按鈕 */}
            <button
              onClick={onEnterInstant}
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                padding: "18px 36px",
                borderRadius: "40px",
                fontSize: "17px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.35)",
                transition: "all 0.2s ease-in-out",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#dc2626";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span>🚨 進入即時災情填報</span>
              <span style={{ fontSize: "18px" }}>➔</span>
            </button>
          </div>

          {/* 統計面板 */}
          <div
            style={{
              background: "white",
              padding: "12px 28px",
              borderRadius: "20px",
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.04)",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              border: "1px solid #e2e8f0"
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>社群累計共創：</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "28px", fontWeight: 900, color: "#2563eb", lineHeight: 1 }}>
                {reportCount}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a8a" }}>筆災情</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. 這個系統可以做什麼？ 功能說明區塊 */}
      <section
        style={{
          width: "100%",
          maxWidth: "1000px",
          padding: "30px 24px 40px 24px",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: "26px",
            fontWeight: 850,
            color: "#0f172a",
            textAlign: "center",
            margin: "0 0 10px 0",
          }}
        >
          這個系統可以做什麼？
        </h2>
        
        <p
          style={{
            fontSize: "16px",
            color: "#475569",
            textAlign: "center",
            fontWeight: 600,
            margin: "0 0 35px 0"
          }}
        >
          本系統提供兩種主要功能：
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            marginBottom: "35px"
          }}
        >
          {/* 功能 1：一般災情填報 */}
          <div
            style={{
              backgroundColor: "white",
              padding: "35px 30px",
              borderRadius: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.02)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "18px",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(37, 99, 235, 0.04)";
              e.currentTarget.style.borderColor = "#bfdbfe";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.02)";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardList size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 10px 0" }}>
                📋 一般災情填報
              </h3>
              <p style={{ fontSize: "14.5px", color: "#475569", lineHeight: 1.7, margin: 0, textAlign: "justify" }}>
                可填寫土地、建物、使用現況、受災程度、淹水高度、泥砂堆積等災後資訊，協助建立受災家戶與土地建物資料庫。
              </p>
            </div>
          </div>

          {/* 功能 2：即時災情填報 */}
          <div
            style={{
              backgroundColor: "white",
              padding: "35px 30px",
              borderRadius: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.02)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "18px",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(239, 68, 68, 0.04)";
              e.currentTarget.style.borderColor = "#fecaca";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.02)";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                backgroundColor: "#fef2f2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#991b1b", margin: "0 0 10px 0" }}>
                🚨 即時災情填報
              </h3>
              <p style={{ fontSize: "14.5px", color: "#475569", lineHeight: 1.7, margin: 0, textAlign: "justify" }}>
                可回報道路中斷、積水、危險區域、災情嚴重或不建議靠近的地點與範圍，提醒其他使用者注意安全。
              </p>
            </div>
          </div>
        </div>

        {/* 提示與說明條 (Callout Box) */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1.5px dashed #bbf7d0",
            padding: "20px 28px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#166534",
            fontSize: "15px",
            fontWeight: 600,
            lineHeight: 1.6,
            boxShadow: "0 4px 12px rgba(22, 101, 52, 0.02)"
          }}
        >
          <span>💡</span>
          <span>這些資料將作為後續空間盤點、災後復原討論、部落與政府溝通，以及參與式 GIS 工作坊的重要基礎。</span>
        </div>
      </section>

      {/* 4. 問與答 FAQ 區塊 */}
      <section
        style={{
          width: "100%",
          maxWidth: "800px",
          padding: "20px 24px 40px 24px",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#0f172a",
            textAlign: "center",
            margin: "0 0 30px 0",
          }}
        >
          常見問與答 (FAQ)
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqList.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.01)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", paddingRight: "10px" }}>
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 24px 24px 24px",
                      fontSize: "14px",
                      color: "#475569",
                      lineHeight: 1.6,
                      borderTop: "1px solid #f1f5f9",
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 團隊與信念 */}
      <section
        style={{
          width: "100%",
          maxWidth: "800px",
          padding: "40px 24px 20px 24px",
          boxSizing: "border-box",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Users size={28} />
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
          關於 政大國土服務團
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#475569",
            lineHeight: 1.65,
            maxWidth: "600px",
            margin: 0,
            textAlign: "justify"
          }}
        >
          我們是來自政治大學的學生社團，我們致力於將學術所學投入社會實踐，希望為部落的土地與安全盡一份心力。
        </p>
      </section>

      {/* 6. Footer 頁尾宣告 */}
      <footer
        style={{
          width: "100%",
          maxWidth: "800px",
          borderTop: "1px solid #cbd5e1",
          marginTop: "40px",
          paddingTop: "24px",
          textAlign: "center",
          fontSize: "13px",
          color: "#94a3b8",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div>
          <span>系統版本 v1.3.0 (Disfactory 專案介紹首頁版)</span>
          <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
          <span>最後更新：2026-08-14</span>
        </div>
        <div>
          <span>開發團隊：<a href="https://www.facebook.com/NCCULUPMCLUB/" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>政大國土服務團</a> &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
