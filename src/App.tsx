import { useEffect, useState } from "react";
import { Map, FileText } from "lucide-react";
import ReportForm from "./components/ReportForm";
import MapView from "./components/MapView";
import type { Report } from "./types/report";
import { supabase } from "./lib/supabase";
import SuccessModal from "./components/SuccessModal";
import MessageBoard from "./components/MessageBoard";
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
  const [mobileView, setMobileView] = useState<'map' | 'form'>('map');
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
        <div className="app-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: view === 'instant' ? "#ef4444" : "#3b82f6",
                }}
              >
                WebGIS 災情填報系統 {view === 'instant' ? "【🚨 即時災情填報模式】" : "【📋 一般災情填報模式】"}
              </p>
            </div>
            <button
              onClick={() => {
                setView('landing');
                setInstantPolygon([]); // 清除多邊形狀態
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: view === 'instant' ? "1.5px solid #ef4444" : "1.5px solid #2563eb",
                backgroundColor: "white",
                color: view === 'instant' ? "#ef4444" : "#2563eb",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = view === 'instant' ? "#fef2f2" : "#eff6ff";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              📖 返回專案介紹
            </button>
          </div>

          <h1 className="app-title" style={{ marginTop: "4px" }}>
            花蓮馬太鞍溪堰塞湖災害參與式地圖
          </h1>

          <div
            style={{
              marginTop: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              backgroundColor: "#e8f0fe",
              borderRadius: "20px",
              color: "#1e40af",
              fontWeight: 600,
              fontSize: "14px",
              animation: isSuccessModalOpen ? "popIn 0.5s ease-out" : "none"
            }}
          >
            <span>社群共創貢獻進度：</span>
            <span style={{ fontSize: "18px", color: "#2563eb", fontWeight: 800 }}>{reports.length}</span>
            <span>筆災情紀錄</span>
          </div>

          <p
            style={{
              marginTop: "6px",
              marginBottom: "4px",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {view === 'instant' 
              ? "即時災情填報：請先在右側地圖上【繪製受災多邊形範圍】，確認範圍後即會彈出左側填報表單。"
              : "一般災情填報：請填寫受災土地建物調查資料，並於地圖點選確切位置以建立災情數據庫。"
            }
          </p>

          {loading && (
            <p
              style={{
                margin: 0,
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              資料載入中...
            </p>
          )}
        </div>

        <div className={`app-content-grid show-${mobileView}`}>
          <div className="app-form-panel">
            <ReportForm
              onAddReport={handleAddReport}
              selectedLocation={selectedLocation}
              defaultTab={view === 'instant' ? 'emergency' : 'detailed'}
              instantPolygon={instantPolygon}
              onPolygonClear={() => setInstantPolygon([])}
            />
          </div>

          <div className="app-map-panel">
            <MapView
              reports={reports}
              selectedLocation={selectedLocation}
              onSelectLocation={(loc) => {
                setSelectedLocation(loc);
                setMobileView('form');
              }}
              lastSubmittedLocation={lastSubmittedLocation}
              mapMode={view}
              onPolygonConfirm={(polygonPoints) => {
                setInstantPolygon(polygonPoints);
                setMobileView('form'); // 繪製確認後自動跳出表單
              }}
            />
          </div>
        </div>

        <MessageBoard />

        <footer style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          color: "#64748b",
          fontSize: "14px",
          paddingBottom: "10px"
        }}>
          開發團隊：<a href="https://www.facebook.com/NCCULUPMCLUB/" target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>政大國土服務團</a>
        </footer>
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setMobileView('map');
          setInstantPolygon([]); // 清空多邊形
        }}
        reportCount={reports.length}
      />

      <div className="mobile-bottom-nav">
        <button
          className={mobileView === 'map' ? 'active' : ''}
          onClick={() => setMobileView('map')}
        >
          <Map size={20} />
          <span>地圖檢視</span>
        </button>
        <button
          className={mobileView === 'form' ? 'active' : ''}
          onClick={() => setMobileView('form')}
        >
          <FileText size={20} />
          <span>填報災情</span>
        </button>
      </div>
    </div>
  );
}

export default App;