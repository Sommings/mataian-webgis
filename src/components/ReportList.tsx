import type { Report } from "../types/report";

type ReportListProps = {
  reports: Report[];
};

function ReportList({ reports }: ReportListProps) {
  return (
    <div style={{ marginTop: "24px" }}>
      <h2>填報資料列表</h2>

      {reports.length === 0 ? (
        <p>目前尚無填報資料</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {reports.map((report, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <p>
                <strong>資料日期：</strong>
                {report.reportDate}
              </p>

              <p>
                <strong>填表人：</strong>
                {report.respondentType}
              </p>

              <p>
                <strong>地址：</strong>
                {report.address}
              </p>

              <p>
                <strong>地號：</strong>
                {report.landParcel}
              </p>

              <p>
                <strong>使用地類別或使用分區：</strong>
                {report.landUseType}
              </p>

              <p>
                <strong>經度：</strong>
                {report.lng}
              </p>

              <p>
                <strong>緯度：</strong>
                {report.lat}
              </p>

              <p>
                <strong>權屬情況：</strong>
                {report.ownership}
              </p>

              <p>
                <strong>用途：</strong>
                {report.usage}
              </p>

              <p>
                <strong>是否原保地：</strong>
                {report.isIndigenousReserve}
              </p>

              <p>
                <strong>土地受災戶：</strong>
                {report.landVictimType}
              </p>

              <p>
                <strong>土地泥沙堆積高度：</strong>
                {report.landMudHeight ?? "未填"} 公分
              </p>

              <p>
                <strong>土地受災程度：</strong>
                {report.landDamageLevel}
              </p>

              <p>
                <strong>建物受災戶：</strong>
                {report.buildingVictimType}
              </p>

              <p>
                <strong>建物型態：</strong>
                {report.buildingType}
                {report.buildingType === "其它" && report.buildingTypeOther
                  ? `（${report.buildingTypeOther}）`
                  : ""}
              </p>

              <p>
                <strong>建物樓層數：</strong>
                {report.buildingFloors ?? "未填"}
              </p>

              <p>
                <strong>建物居住人數：</strong>
                {report.buildingResidents ?? "未填"}
              </p>

              <p>
                <strong>建物建築材質：</strong>
                {report.buildingMaterial}
              </p>

              <p>
                <strong>建物有無建造執照：</strong>
                {report.hasBuildingPermit}
              </p>

              <p>
                <strong>建物有無使用執照：</strong>
                {report.hasUsePermit}
              </p>

              <p>
                <strong>建物災時淹水高度：</strong>
                {report.buildingFloodHeight ?? "未填"} 公分
              </p>

              <p>
                <strong>建物目前泥沙堆積高度：</strong>
                {report.buildingMudHeight ?? "未填"} 公分
              </p>

              <p>
                <strong>建物受災程度：</strong>
                {report.buildingDamageLevel}
              </p>

              <p>
                <strong>建物受損面積：</strong>
                {report.damagedAreaPing ?? "未填"} 坪
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportList;