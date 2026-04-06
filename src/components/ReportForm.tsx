import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { emptyReport, type Report } from "../types/report";

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type ReportFormProps = {
  onAddReport: (report: Report) => Promise<void>;
  selectedLocation: SelectedLocation;
};

type StepKey = "basic" | "land" | "building";

function ReportForm({ onAddReport, selectedLocation }: ReportFormProps) {
  const [formData, setFormData] = useState<Report>(emptyReport);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      }));
    }
  }, [selectedLocation]);

  const visibleSteps = useMemo<StepKey[]>(() => {
    const steps: StepKey[] = ["basic"];
    if (formData.hasLandDamage === "是") {
      steps.push("land");
    }
    if (formData.hasBuildingDamage === "是") {
      steps.push("building");
    }
    return steps;
  }, [formData.hasLandDamage, formData.hasBuildingDamage]);

  useEffect(() => {
    if (currentStepIndex > visibleSteps.length - 1) {
      setCurrentStepIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps, currentStepIndex]);

  const currentStep = visibleSteps[currentStepIndex];
  const isLastStep = currentStepIndex === visibleSteps.length - 1;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    const numberFields = [
      "lat",
      "lng",
      "landMudHeight",
      "buildingFloors",
      "buildingResidents",
      "buildingFloodHeight",
      "buildingMudHeight",
      "damagedAreaPing",
    ];

    if (numberFields.includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : Number(value),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateBasicStep = () => {
    if (!selectedLocation) {
      alert("請先在地圖上點選位置");
      return false;
    }

    if (!formData.reportDate) {
      alert("請填寫資料日期");
      return false;
    }

    if (!formData.address.trim()) {
      alert("請填寫地址");
      return false;
    }

    if (!formData.landParcel.trim()) {
      alert("請填寫地號");
      return false;
    }

    if (!formData.landUseType.trim()) {
      alert("請填寫使用地類別或使用分區");
      return false;
    }

    return true;
  };

  const validateLandStep = () => {
    if (formData.hasLandDamage === "否") {
      return true;
    }
    return true;
  };

  const validateBuildingStep = () => {
    if (formData.hasBuildingDamage === "否") {
      return true;
    }

    if (formData.buildingType === "其它" && !formData.buildingTypeOther.trim()) {
      alert("建物型態選擇其它時，請填寫說明");
      return false;
    }

    return true;
  };

  const validateCurrentStep = () => {
    if (currentStep === "basic") return validateBasicStep();
    if (currentStep === "land") return validateLandStep();
    if (currentStep === "building") return validateBuildingStep();
    return true;
  };

  const sanitizeReportBeforeSubmit = (report: Report): Report => {
    const cleaned: Report = { ...report };

    if (cleaned.hasLandDamage === "否") {
      cleaned.landVictimType = "使用權人";
      cleaned.landMudHeight = null;
      cleaned.landDamageLevel = "1級：局部損害但可維持原使用";
    }

    if (cleaned.hasBuildingDamage === "否") {
      cleaned.buildingVictimType = "使用權人";
      cleaned.buildingType = "獨棟透天";
      cleaned.buildingTypeOther = "";
      cleaned.buildingFloors = null;
      cleaned.buildingResidents = null;
      cleaned.buildingMaterial = "鋼筋混凝土造RC";
      cleaned.hasBuildingPermit = "否";
      cleaned.hasUsePermit = "否";
      cleaned.buildingFloodHeight = null;
      cleaned.buildingMudHeight = null;
      cleaned.buildingDamageLevel = "1級：局部損害但可居住";
      cleaned.damagedAreaPing = null;
    }

    return cleaned;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;

    if (isLastStep) {
      void handleFinalSubmit();
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    if (!validateBasicStep()) return;
    if (!validateLandStep()) return;
    if (!validateBuildingStep()) return;

    try {
      const cleanedReport = sanitizeReportBeforeSubmit(formData);
      await onAddReport(cleanedReport);

      setFormData({
        ...emptyReport,
        lat: selectedLocation ? selectedLocation.lat : 0,
        lng: selectedLocation ? selectedLocation.lng : 0,
      });
      setCurrentStepIndex(0);
    } catch (error) {
      console.error("表單送出失敗：", error);
      alert("送出失敗，請查看 Console");
    }
  };

  const fieldStyle: CSSProperties = {
    width: "100%",
    marginTop: "6px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d7dee7",
    fontSize: "14px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "14px",
    color: "#334155",
    fontWeight: 600,
  };

  const sectionTitleStyle: CSSProperties = {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "22px",
    color: "#1f2d3d",
  };

  const sectionDescStyle: CSSProperties = {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "14px",
    color: "#64748b",
    lineHeight: 1.6,
  };

  const stepBadgeStyle = (index: number): CSSProperties => ({
    flex: 1,
    padding: "10px 12px",
    borderRadius: "12px",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: 700,
    backgroundColor: currentStepIndex === index ? "#2563eb" : "#e8eef6",
    color: currentStepIndex === index ? "#ffffff" : "#475569",
  });

  const stepLabelMap: Record<StepKey, string> = {
    basic: "1. 基本資料",
    land: "2. 土地受災資訊",
    building: "3. 建物受災資訊",
  };

  return (
    <div>
      <h2
        style={{
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "24px",
          color: "#1f2d3d",
        }}
      >
        填報表單
      </h2>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "18px",
        }}
      >
        {visibleSteps.map((step, index) => (
          <div key={step} style={stepBadgeStyle(index)}>
            {stepLabelMap[step]}
          </div>
        ))}
      </div>

      <div
        style={{
          marginBottom: "18px",
          padding: "12px 14px",
          borderRadius: "12px",
          backgroundColor: "#f6f9fc",
          border: "1px solid #e3ebf3",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "#1f2d3d",
            marginBottom: "6px",
          }}
        >
          目前選點座標
        </div>
        <div style={{ fontSize: "14px", color: "#4b5c6b" }}>
          緯度：{selectedLocation ? selectedLocation.lat : "尚未選擇"}
        </div>
        <div style={{ fontSize: "14px", color: "#4b5c6b", marginTop: "4px" }}>
          經度：{selectedLocation ? selectedLocation.lng : "尚未選擇"}
        </div>
      </div>

      {currentStep === "basic" && (
        <div>
          <h3 style={sectionTitleStyle}>基本資料</h3>
          <p style={sectionDescStyle}>
            請先填寫受災地點與基本土地資訊，並決定是否有土地與建物受災。
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            <label style={labelStyle}>
              資料日期
              <input
                style={fieldStyle}
                type="date"
                name="reportDate"
                value={formData.reportDate}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              填表人
              <select
                style={fieldStyle}
                name="respondentType"
                value={formData.respondentType}
                onChange={handleChange}
              >
                <option value="馬太鞍居民">馬太鞍居民</option>
                <option value="非馬太鞍居民">非馬太鞍居民</option>
              </select>
            </label>

            <label style={labelStyle}>
              地址
              <input
                style={fieldStyle}
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="請輸入地址"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              經度
              <input
                style={fieldStyle}
                type="number"
                step="any"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              緯度
              <input
                style={fieldStyle}
                type="number"
                step="any"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              地號
              <input
                style={fieldStyle}
                type="text"
                name="landParcel"
                value={formData.landParcel}
                onChange={handleChange}
                placeholder="請輸入地號"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              使用地類別或使用分區
              <input
                style={fieldStyle}
                type="text"
                name="landUseType"
                value={formData.landUseType}
                onChange={handleChange}
                placeholder="例如：特定農業區、一般農業區、建地等"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              權屬情況
              <select
                style={fieldStyle}
                name="ownership"
                value={formData.ownership}
                onChange={handleChange}
              >
                <option value="公有">公有</option>
                <option value="私有">私有</option>
              </select>
            </label>

            <label style={labelStyle}>
              用途
              <select
                style={fieldStyle}
                name="usage"
                value={formData.usage}
                onChange={handleChange}
              >
                <option value="居住">居住</option>
                <option value="農用">農用</option>
                <option value="商用">商用</option>
                <option value="公共服務">公共服務</option>
              </select>
            </label>

            <label style={labelStyle}>
              是否是原保地
              <select
                style={fieldStyle}
                name="isIndigenousReserve"
                value={formData.isIndigenousReserve}
                onChange={handleChange}
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </label>

            <label style={labelStyle}>
              是否有土地受災
              <select
                style={fieldStyle}
                name="hasLandDamage"
                value={formData.hasLandDamage}
                onChange={handleChange}
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </label>

            <label style={labelStyle}>
              是否有建物受災
              <select
                style={fieldStyle}
                name="hasBuildingDamage"
                value={formData.hasBuildingDamage}
                onChange={handleChange}
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {currentStep === "land" && (
        <div>
          <h3 style={sectionTitleStyle}>土地受災資訊</h3>
          <p style={sectionDescStyle}>
            請填寫土地目前受災狀況，包括受災戶身分、泥沙堆積與受災程度。
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            <label style={labelStyle}>
              土地受災戶
              <select
                style={fieldStyle}
                name="landVictimType"
                value={formData.landVictimType}
                onChange={handleChange}
              >
                <option value="使用權人">使用權人</option>
                <option value="所有權人">所有權人</option>
              </select>
            </label>

            <label style={labelStyle}>
              目前泥沙堆積高度（公分）
              <input
                style={fieldStyle}
                type="number"
                name="landMudHeight"
                value={formData.landMudHeight ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              土地受災程度
              <select
                style={fieldStyle}
                name="landDamageLevel"
                value={formData.landDamageLevel}
                onChange={handleChange}
              >
                <option value="1級：局部損害但可維持原使用">
                  1級：局部損害但可維持原使用
                </option>
                <option value="2級：半數面積無法使用">
                  2級：半數面積無法使用
                </option>
                <option value="3級：幾乎完全無法使用">
                  3級：幾乎完全無法使用
                </option>
              </select>
            </label>
          </div>
        </div>
      )}

      {currentStep === "building" && (
        <div>
          <h3 style={sectionTitleStyle}>建物受災資訊</h3>
          <p style={sectionDescStyle}>
            請填寫建物受災情形、建物特性與受損範圍。
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            <label style={labelStyle}>
              建物受災戶
              <select
                style={fieldStyle}
                name="buildingVictimType"
                value={formData.buildingVictimType}
                onChange={handleChange}
              >
                <option value="使用權人">使用權人</option>
                <option value="所有權人">所有權人</option>
              </select>
            </label>

            <label style={labelStyle}>
              建物型態
              <select
                style={fieldStyle}
                name="buildingType"
                value={formData.buildingType}
                onChange={handleChange}
              >
                <option value="獨棟透天">獨棟透天</option>
                <option value="連棟透天">連棟透天</option>
                <option value="獨棟公寓">獨棟公寓</option>
                <option value="連棟公寓">連棟公寓</option>
                <option value="獨棟大樓">獨棟大樓</option>
                <option value="其它">其它</option>
              </select>
            </label>

            {formData.buildingType === "其它" && (
              <label style={labelStyle}>
                建物型態其它說明
                <input
                  style={fieldStyle}
                  type="text"
                  name="buildingTypeOther"
                  value={formData.buildingTypeOther}
                  onChange={handleChange}
                  placeholder="請輸入其它建物型態"
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                />
              </label>
            )}

            <label style={labelStyle}>
              建物樓層數
              <input
                style={fieldStyle}
                type="number"
                name="buildingFloors"
                value={formData.buildingFloors ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              建物居住人數
              <input
                style={fieldStyle}
                type="number"
                name="buildingResidents"
                value={formData.buildingResidents ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              建物建築材質
              <select
                style={fieldStyle}
                name="buildingMaterial"
                value={formData.buildingMaterial}
                onChange={handleChange}
              >
                <option value="木造">木造</option>
                <option value="磚造">磚造</option>
                <option value="鋼筋混凝土造RC">鋼筋混凝土造RC</option>
              </select>
            </label>

            <label style={labelStyle}>
              建物有無建造執照
              <select
                style={fieldStyle}
                name="hasBuildingPermit"
                value={formData.hasBuildingPermit}
                onChange={handleChange}
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </label>

            <label style={labelStyle}>
              建物有無使用執照
              <select
                style={fieldStyle}
                name="hasUsePermit"
                value={formData.hasUsePermit}
                onChange={handleChange}
              >
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </label>

            <label style={labelStyle}>
              建物災時淹水高度（公分）
              <input
                style={fieldStyle}
                type="number"
                name="buildingFloodHeight"
                value={formData.buildingFloodHeight ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              建物目前泥沙堆積高度（公分）
              <input
                style={fieldStyle}
                type="number"
                name="buildingMudHeight"
                value={formData.buildingMudHeight ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>

            <label style={labelStyle}>
              建物受災程度
              <select
                style={fieldStyle}
                name="buildingDamageLevel"
                value={formData.buildingDamageLevel}
                onChange={handleChange}
              >
                <option value="1級：局部損害但可居住">
                  1級：局部損害但可居住
                </option>
                <option value="2級：部分空間無法使用">
                  2級：部分空間無法使用
                </option>
                <option value="3級：主要結構或生活機能嚴重受損">
                  3級：主要結構或生活機能嚴重受損
                </option>
              </select>
            </label>

            <label style={labelStyle}>
              建物受損面積（坪）
              <input
                style={fieldStyle}
                type="number"
                step="any"
                name="damagedAreaPing"
                value={formData.damagedAreaPing ?? ""}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </label>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "24px",
        }}
      >
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevStep}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            上一步
          </button>
        )}

        <button
          type="button"
          onClick={handleNextStep}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "none",
            borderRadius: "12px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isLastStep ? "送出填報" : "下一步"}
        </button>
      </div>
    </div>
  );
}

export default ReportForm;