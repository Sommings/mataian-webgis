import type { Report } from "../types/report";

type ReportListProps = {
  reports: Report[];
};

function ReportList({ reports }: ReportListProps) {
  if (reports.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(31, 45, 61, 0.08)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "12px",
            fontSize: "22px",
            color: "#1f2d3d",
          }}
        >
          填報紀錄
        </h2>
        <p style={{ color: "#64748b", margin: 0 }}>目前尚無填報資料。</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(31, 45, 61, 0.08)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "22px",
          color: "#1f2d3d",
        }}
      >
        填報紀錄
      </h2>

      <div style={{ display: "grid", gap: "12px" }}>
        {reports.map((report, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              backgroundColor: "#f8fafc",
            }}
          >
            <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#1f2d3d" }}>
              {report.reportDate}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#475569" }}>
              填表人：{report.respondentType || "未填"}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#475569" }}>
              部落：{report.tribeName || "未填"}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#475569" }}>
              地址：{report.address || "未填"}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#475569" }}>
              地點名稱：{report.placeName || "未填"}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#475569" }}>
              地號：{report.landParcel || "未填"}
            </p>
            <p style={{ margin: 0, color: "#475569" }}>
              土地受災：{report.hasLandDamage || "未填"}；建物受災：
              {report.hasBuildingDamage || "未填"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportList;