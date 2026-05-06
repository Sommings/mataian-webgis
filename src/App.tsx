import { useEffect, useState } from "react";
import ReportForm from "./components/ReportForm";
import MapView from "./components/MapView";
import type { Report } from "./types/report";
import { supabase } from "./lib/supabase";
import SuccessModal from "./components/SuccessModal";
import MessageBoard from "./components/MessageBoard";
import confetti from "canvas-confetti";

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
  place_name: string;
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
    placeName: row.place_name,
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
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);
  const [loading, setLoading] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastSubmittedLocation, setLastSubmittedLocation] = useState<SelectedLocation>(null);



  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("讀取 Supabase 失敗：", error);
        alert("讀取資料庫失敗，請查看 Console");
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
      place_name: newReport.placeName,
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
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#3b82f6', '#60a5fa', '#f59e0b', '#10b981']
    });
    
    if (insertedReport.lat !== null && insertedReport.lng !== null) {
      setLastSubmittedLocation({ lat: insertedReport.lat, lng: insertedReport.lng });
    }
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="app-wrapper">
      <div className="app-container">
        <div className="app-header">
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#3b82f6",
            }}
          >
            WebGIS 災情填報系統
          </p>

          <h1 className="app-title">
            花蓮光復鄉 馬太鞍災情填報地圖
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
              marginTop: "10px",
              marginBottom: "0",
              color: "#059669",
              fontSize: "14px",
              lineHeight: 1.5,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            🌱 您的每一筆標註，都是幫助馬太鞍精準掌握災情、加速重建的關鍵力量！
          </p>

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
            左側填寫受災資料，右側地圖點選位置並查看既有填報點位。
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

        <div className="app-content-grid">
          <div className="app-form-panel">
            <ReportForm
              onAddReport={handleAddReport}
              selectedLocation={selectedLocation}
            />
          </div>

          <div className="app-map-panel">
            <MapView
              reports={reports}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
              lastSubmittedLocation={lastSubmittedLocation}
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
        onClose={() => setIsSuccessModalOpen(false)} 
        reportCount={reports.length} 
      />
    </div>
  );
}

export default App;