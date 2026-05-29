import { useEffect, useState } from "react";
import { Map, FileText } from "lucide-react";
import ReportForm from "./components/ReportForm";
import MapView from "./components/MapView";
import type { Report } from "./types/report";
import { supabase } from "./lib/supabase";
import SuccessModal from "./components/SuccessModal";
import LandingPage from "./components/LandingPage";

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type ReportRow = {
  id: number;
  report_date: string;
  respondent_type: Report["respondentType"];
  tribe_name: Report["tribeName"];
  address: string;
  lng: number;
  lat: number;
  land_parcel: string;
  ownership: Report["ownership"];
  usage: Report["usage"];
  is_indigenous_reserve: Report["isIndigenousReserve"];
  has_land_damage: Report["hasLandDamage"];
  has_building_damage: Report["hasBuildingDamage"];
  land_victim_type: Report["landVictimType"];
  land_mud_height: Report["landMudHeight"];
  land_damage_level: Report["landDamageLevel"];
  building_victim_type: Report["buildingVictimType"];
  building_type: Report["buildingType"];
  building_type_other: string | null;
  building_floors: number | null;
  building_residents: number | null;
  building_material: Report["buildingMaterial"];
  has_building_permit: Report["hasBuildingPermit"];
  has_use_permit: Report["hasUsePermit"];
  building_flood_height: Report["buildingFloodHeight"];
  building_mud_height: Report["buildingMudHeight"];
  building_damage_level: Report["buildingDamageLevel"];
  damaged_area_ping: number | null;
  photos: string[] | null;
  created_at: string;
};

function mapRowToReport(row: ReportRow): Report {
  return {
    reportDate: row.report_date,
    respondentType: row.respondent_type,
    tribeName: row.tribe_name,
    address: row.address,
    lng: row.lng,
    lat: row.lat,
    landParcel: row.land_parcel,
    ownership: row.ownership,
    usage: row.usage,
    isIndigenousReserve: row.is_indigenous_reserve,
    hasLandDamage: row.has_land_damage,
    hasBuildingDamage: row.has_building_damage,
    landVictimType: row.land_victim_type,
    landMudHeight: row.land_mud_height,
    landDamageLevel: row.land_damage_level,
    buildingVictimType: row.building_victim_type,
    buildingType: row.building_type,
    buildingTypeOther: row.building_type_other ?? "",
    buildingFloors: row.building_floors,
    buildingResidents: row.building_residents,
    buildingMaterial: row.building_material,
    hasBuildingPermit: row.has_building_permit,
    hasUsePermit: row.has_use_permit,
    buildingFloodHeight: row.building_flood_height,
    buildingMudHeight: row.building_mud_height,
    buildingDamageLevel: row.building_damage_level,
    damagedAreaPing: row.damaged_area_ping,
    photos: row.photos || [],
  };
}

function App() {
  // 視圖狀態：landing (首頁), general (一般災情填報), instant (即時災情填報)
  const [view, setView] = useState<'landing' | 'general' | 'instant'>('landing');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);
  const [loading, setLoading] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSubmittedLocation, setLastSubmittedLocation] = useState<SelectedLocation>(null);

  // 用於在即時填報模式中儲存多邊形繪製的頂點座標陣列
  const [instantPolygon, setInstantPolygon] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("讀取 Supabase 失敗：", error);
        alert("讀取資料庫失敗，請查看主控台說明。");
        setLoading(false);
        return;
      }

      const mappedReports = (data as ReportRow[]).map(mapRowToReport);
      setReports(mappedReports);
      setLoading(false);
    };

    fetchReports();
  }, []);

  const handleAddReport = async (newReport: Report): Promise<void> => {
    const payload = {
      report_date: newReport.reportDate,
      respondent_type: newReport.respondentType,
      tribe_name: newReport.tribeName,
      address: newReport.address,
      lng: newReport.lng,
      lat: newReport.lat,
      land_parcel: newReport.landParcel,
      ownership: newReport.ownership,
      usage: newReport.usage,
      is_indigenous_reserve: newReport.isIndigenousReserve,
      has_land_damage: newReport.hasLandDamage,
      has_building_damage: newReport.hasBuildingDamage,
      land_victim_type: newReport.landVictimType,
      land_mud_height: newReport.landMudHeight,
      land_damage_level: newReport.landDamageLevel,
      building_victim_type: newReport.buildingVictimType,
      building_type: newReport.buildingType,
      building_type_other: newReport.buildingTypeOther,
      building_floors: newReport.buildingFloors,
      building_residents: newReport.buildingResidents,
      building_material: newReport.buildingMaterial,
      has_building_permit: newReport.hasBuildingPermit,
      has_use_permit: newReport.hasUsePermit,
      building_flood_height: newReport.buildingFloodHeight,
      building_mud_height: newReport.buildingMudHeight,
      building_damage_level: newReport.buildingDamageLevel,
      damaged_area_ping: newReport.damagedAreaPing,
      photos: newReport.photos,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("寫入 Supabase 失敗：", error);
      throw error;
    }

    const insertedReport = mapRowToReport(data as ReportRow);
    setReports((prev) => [insertedReport, ...prev]);

    if (insertedReport.lat !== null && insertedReport.lng !== null) {
      setLastSubmittedLocation({ lat: insertedReport.lat, lng: insertedReport.lng });
    }
    setIsSuccessModalOpen(true);
  };

  // 1. 條件渲染首頁 LandingPage
  if (view === 'landing') {
    return (
      <LandingPage
        onEnterGeneral={() => setView('general')}
        onEnterInstant={() => setView('instant')}
        reportCount={reports.length}
      />
    );
  }

  // 2. 填報地圖主 UI 面板
  return (
    <div className="app-wrapper">
      <div className="app-container">
        <div className="app-floating-header">
          <div className="header-left">
            <h1 className="header-title">
              花蓮馬太鞍溪堰塞湖災害參與式地圖
            </h1>
            <span className={`mode-badge ${view === 'instant' ? 'instant' : 'general'}`}>
              {view === 'instant' ? "🚨 即時災情填報模式" : "📋 一般災情填報模式"}
            </span>
          </div>

          <div className="header-right">
            {loading && (
              <span className="header-loading-text">
                資料載入中...
              </span>
            )}
            <button
              onClick={() => {
                setView('landing');
                setInstantPolygon([]); // 清除多邊形狀態
                setIsFormOpen(false); // 關閉表單側邊欄
              }}
              className="back-btn"
            >
              📖 返回專案介紹
            </button>
          </div>
        </div>

        <div className="app-content-grid">
          {/* 填報表單側邊欄 (Disfactory 風格) */}
          <div className={`app-form-panel ${isFormOpen ? 'open' : ''}`}>
            {isFormOpen && (
              <button
                onClick={() => setIsFormOpen(false)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#64748b",
                  zIndex: 1010,
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
              >
                ✕
              </button>
            )}
            <ReportForm
              onAddReport={async (report) => {
                await handleAddReport(report);
                setIsFormOpen(false); // 成功填報後自動收起側邊欄
              }}
              selectedLocation={selectedLocation}
              defaultTab={view === 'instant' ? 'emergency' : 'detailed'}
              instantPolygon={instantPolygon}
              onPolygonClear={() => setInstantPolygon([])}
            />
          </div>

          {/* 地圖滿版區塊 */}
          <div className="app-map-panel">
            <MapView
              reports={reports}
              selectedLocation={selectedLocation}
              onSelectLocation={(loc) => {
                setSelectedLocation(loc);
                // 點擊選點不再自動彈出表單，讓使用者在 Popup 內點擊「確認點位，開始填報」
              }}
              onConfirmGeneralLocation={() => {
                setIsFormOpen(true); // 點擊氣泡內的確認按鈕後彈出表單
              }}
              lastSubmittedLocation={lastSubmittedLocation}
              mapMode={view}
              onPolygonConfirm={(polygonPoints) => {
                setInstantPolygon(polygonPoints);
                setIsFormOpen(true); // 確認多邊形繪製後自動彈出表單
              }}
            />
          </div>
        </div>


      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setIsFormOpen(false); // 關閉表單側邊欄
          setInstantPolygon([]); // 清空多邊形
        }}
        reportCount={reports.length}
      />

      {/* 手動同步移動端底層導航至側邊欄狀態 */}
      <div className="mobile-bottom-nav">
        <button
          className={!isFormOpen ? 'active' : ''}
          onClick={() => setIsFormOpen(false)}
        >
          <Map size={20} />
          <span>地圖檢視</span>
        </button>
        <button
          className={isFormOpen ? 'active' : ''}
          onClick={() => setIsFormOpen(true)}
        >
          <FileText size={20} />
          <span>填報災情</span>
        </button>
      </div>
    </div>
  );
}

export default App;