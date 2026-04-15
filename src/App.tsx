import { useEffect, useState } from "react";
import ReportForm from "./components/ReportForm";
import MapView from "./components/MapView";
import type { Report } from "./types/report";
import { supabase } from "./lib/supabase";

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type ReportRow = {
  id: number;
  report_date: string;
  respondent_type: Report["respondentType"];
  address: string;
  lng: number;
  lat: number;
  land_parcel: string;
  land_use_type: string;
  ownership: Report["ownership"];
  usage: Report["usage"];
  is_indigenous_reserve: Report["isIndigenousReserve"];
  has_land_damage: Report["hasLandDamage"];
  has_building_damage: Report["hasBuildingDamage"];
  land_victim_type: Report["landVictimType"];
  land_mud_height: number | null;
  land_damage_level: Report["landDamageLevel"];
  building_victim_type: Report["buildingVictimType"];
  building_type: Report["buildingType"];
  building_type_other: string | null;
  building_floors: number | null;
  building_residents: number | null;
  building_material: Report["buildingMaterial"];
  has_building_permit: Report["hasBuildingPermit"];
  has_use_permit: Report["hasUsePermit"];
  building_flood_height: number | null;
  building_mud_height: number | null;
  building_damage_level: Report["buildingDamageLevel"];
  damaged_area_ping: number | null;
  created_at: string;
};

function mapRowToReport(row: ReportRow): Report {
  return {
    reportDate: row.report_date,
    respondentType: row.respondent_type,
    address: row.address,
    lng: row.lng,
    lat: row.lat,
    landParcel: row.land_parcel,
    landUseType: row.land_use_type,
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
  };
}

function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const root = document.documentElement;
      if (window.innerWidth <= 980) {
        root.style.setProperty("--app-grid-columns", "1fr");
        root.style.setProperty("--app-form-position", "static");
        root.style.setProperty("--app-map-min-height", "520px");
      } else {
        root.style.setProperty("--app-grid-columns", "420px 1fr");
        root.style.setProperty("--app-form-position", "sticky");
        root.style.setProperty("--app-map-min-height", "700px");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      address: newReport.address,
      lng: newReport.lng,
      lat: newReport.lat,
      land_parcel: newReport.landParcel,
      land_use_type: newReport.landUseType,
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
    alert("已成功填報！");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eef4fb 0%, #f7f9fc 100%)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "95vw",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <div
  style={{
    marginBottom: "20px",
    padding: "8px 4px",
    textAlign: "center",
  }}
>
  <h1
    style={{
      margin: 0,
      fontSize: "32px",
      lineHeight: 1.2,
      color: "#1f2d3d",
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    花蓮光復鄉 馬太鞍災情填報地圖
  </h1>

  <p
    style={{
      marginTop: "10px",
      marginBottom: "6px",
      color: "#5b6b7a",
      fontSize: "15px",
      textAlign: "center",
    }}
  >
    左側填寫受災資料，右側地圖點選位置並查看既有填報點位。
  </p>

          {loading && (
            <p
              style={{
                margin: 0,
                color: "#2b6cb0",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              資料載入中...
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "var(--app-grid-columns, 420px 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 10px 30px rgba(31, 45, 61, 0.08)",
              position: "var(--app-form-position, sticky)" as "sticky",
              top: "24px",
            }}
          >
            <ReportForm
              onAddReport={handleAddReport}
              selectedLocation={selectedLocation}
            />
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "18px",
              boxShadow: "0 10px 30px rgba(31, 45, 61, 0.08)",
              minHeight: "var(--app-map-min-height, 700px)",
            }}
          >
            <MapView
              reports={reports}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;