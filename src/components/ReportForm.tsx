import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { emptyReport, type Report } from "../types/report";
import ConsentModal from "./ConsentModal";
import { supabase } from "../lib/supabase";

type SelectedLocation = {
  lat: number;
  lng: number;
} | null;

type ReportFormProps = {
  onAddReport: (report: Report) => Promise<void>;
  selectedLocation: SelectedLocation;
  defaultTab?: 'emergency' | 'detailed';
  instantPolygon?: [number, number][];
  onPolygonClear?: () => void;
};

type StepKey = "basic" | "land" | "building";

const getCurrentDateTimeString = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function ReportForm({
  onAddReport,
  selectedLocation,
  defaultTab,
  instantPolygon = [],
  onPolygonClear,
}: ReportFormProps) {
  const [activeTab, setActiveTab] = useState<'emergency' | 'detailed'>('detailed');

  // For emergency form
  const [instantType, setInstantType] = useState("");
  const [instantDesc, setInstantDesc] = useState("");
  const [emergencyRespondent, setEmergencyRespondent] = useState("");
  const [emergencyTribe, setEmergencyTribe] = useState("");
  const [emergencyFiles, setEmergencyFiles] = useState<File[]>([]);
  const [isEmergencyConsentChecked, setIsEmergencyConsentChecked] = useState(false);
  const [isEmergencySubmitting, setIsEmergencySubmitting] = useState(false);

  // Existing detailed form states
  const [formData, setFormData] = useState<Report>({
    ...emptyReport,
    reportDate: getCurrentDateTimeString(),
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

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
      "buildingFloors",
      "buildingResidents",
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
    if (formData.lat === null || formData.lng === null) {
      alert("請先在地圖上點選位置，或手動輸入經緯度");
      return false;
    }

    if (!formData.reportDate) {
      alert("系統時間尚未載入，請稍後再試");
      return false;
    }

    if (!formData.respondentType) {
      alert("請選擇填表人");
      return false;
    }

    if (!formData.tribeName) {
      alert("請選擇屬於哪個部落");
      return false;
    }

    if (!formData.ownership) {
      alert("請選擇權屬情況");
      return false;
    }

    if (!formData.usage) {
      alert("請選擇用途");
      return false;
    }

    if (!formData.isIndigenousReserve) {
      alert("請選擇是否是原保地");
      return false;
    }

    if (!formData.hasLandDamage) {
      alert("請選擇是否有土地受災");
      return false;
    }

    if (!formData.hasBuildingDamage) {
      alert("請選擇是否有建物受災");
      return false;
    }

    return true;
  };

  const validateLandStep = () => {
    if (formData.hasLandDamage === "否") {
      return true;
    }

    if (!formData.landVictimType) {
      alert("請選擇土地受災戶");
      return false;
    }

    if (!formData.landMudHeight) {
      alert("請選擇目前泥沙堆積高度");
      return false;
    }

    if (!formData.landDamageLevel) {
      alert("請選擇土地受災程度");
      return false;
    }

    return true;
  };

  const validateBuildingStep = () => {
    if (formData.hasBuildingDamage === "否") {
      return true;
    }

    if (!formData.buildingVictimType) {
      alert("請選擇建物受災戶");
      return false;
    }

    if (!formData.buildingType) {
      alert("請選擇建物型態");
      return false;
    }

    if (formData.buildingType === "其它" && !formData.buildingTypeOther.trim()) {
      alert("建物型態選擇其它時，請填寫說明");
      return false;
    }

    if (formData.buildingFloors === null) {
      alert("請填寫建物樓層數");
      return false;
    }

    if (formData.buildingResidents === null) {
      alert("請填寫建物居住人數");
      return false;
    }

    if (!formData.buildingMaterial) {
      alert("請選擇建物建築材質");
      return false;
    }

    if (!formData.hasBuildingPermit) {
      alert("請選擇建物有無建造執照");
      return false;
    }

    if (!formData.hasUsePermit) {
      alert("請選擇建物有無使用執照");
      return false;
    }

    if (!formData.buildingFloodHeight) {
      alert("請選擇建物災時淹水高度");
      return false;
    }

    if (!formData.buildingMudHeight) {
      alert("請選擇建物目前泥沙堆積高度");
      return false;
    }

    if (!formData.buildingDamageLevel) {
      alert("請選擇建物受災程度");
      return false;
    }

    if (formData.damagedAreaPing === null) {
      alert("請填寫建物受損面積");
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
      cleaned.landVictimType = "";
      cleaned.landMudHeight = "";
      cleaned.landDamageLevel = "";
    }

    if (cleaned.hasBuildingDamage === "否") {
      cleaned.buildingVictimType = "";
      cleaned.buildingType = "";
      cleaned.buildingTypeOther = "";
      cleaned.buildingFloors = null;
      cleaned.buildingResidents = null;
      cleaned.buildingMaterial = "";
      cleaned.hasBuildingPermit = "";
      cleaned.hasUsePermit = "";
      cleaned.buildingFloodHeight = "";
      cleaned.buildingMudHeight = "";
      cleaned.buildingDamageLevel = "";
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

    if (!isConsentChecked) {
      alert("請閱讀並同意個人資料蒐集聲明");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedPhotos: string[] = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("disaster_photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error("圖片上傳失敗：", uploadError);
          alert(`圖片 ${file.name} 上傳失敗，請稍後再試。`);
          setIsSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("disaster_photos")
          .getPublicUrl(filePath);

        uploadedPhotos.push(publicUrlData.publicUrl);
      }

      const cleanedReport = sanitizeReportBeforeSubmit({
        ...formData,
        photos: uploadedPhotos,
      });

      // 如果有即時繪製的多邊形災害範圍點位，則將其序列化並附加於 address 欄位末端
      if (instantPolygon && instantPolygon.length > 0) {
        const polygonStr = ` | 災害範圍 (多邊形點位): ${JSON.stringify(instantPolygon)}`;
        cleanedReport.address = cleanedReport.address 
          ? `${cleanedReport.address}${polygonStr}` 
          : `災害範圍 (多邊形點位): ${JSON.stringify(instantPolygon)}`;
      }

      await onAddReport(cleanedReport);

      setFormData({
        ...emptyReport,
        reportDate: getCurrentDateTimeString(),
        lat: selectedLocation ? selectedLocation.lat : null,
        lng: selectedLocation ? selectedLocation.lng : null,
      });
      setSelectedFiles([]);
      setCurrentStepIndex(0);
      setIsConsentChecked(false);
    } catch (error) {
      console.error("表單送出失敗：", error);
      alert("送出失敗，請查看 Console");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencySubmit = async () => {
    if (!selectedLocation && (!instantPolygon || instantPolygon.length === 0)) {
      alert("請先在地圖上點選位置或繪製災害範圍！");
      return;
    }

    if (!instantType) {
      alert("請選擇即時災情類型");
      return;
    }

    if (!instantDesc.trim()) {
      alert("請輸入災情說明與提醒");
      return;
    }

    if (!emergencyRespondent) {
      alert("請選擇填表人");
      return;
    }

    if (!emergencyTribe) {
      alert("請選擇屬於哪個部落");
      return;
    }

    if (!isEmergencyConsentChecked) {
      alert("請閱讀並同意個人資料蒐集聲明");
      return;
    }

    setIsEmergencySubmitting(true);

    try {
      const uploadedPhotos: string[] = [];
      for (const file of emergencyFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("disaster_photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error("圖片上傳失敗：", uploadError);
          alert(`圖片 ${file.name} 上傳失敗，請稍後再試。`);
          setIsEmergencySubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("disaster_photos")
          .getPublicUrl(filePath);

        uploadedPhotos.push(publicUrlData.publicUrl);
      }

      // 構建即時災情的 address 欄位（序列化類型、說明與多邊形範圍點位）
      let serializedAddress = `[🚨即時災情] 類型: ${instantType} | 說明: ${instantDesc}`;
      if (instantPolygon && instantPolygon.length > 0) {
        serializedAddress += ` | 災害範圍 (多邊形點位): ${JSON.stringify(instantPolygon)}`;
      }

      // 計算多邊形所有頂點的幾何中心點 (Centroid) 作為資料庫備用定位點，以滿足 Supabase NOT NULL 的限制
      let databaseLat: number | null = null;
      let databaseLng: number | null = null;
      
      if (selectedLocation) {
        databaseLat = selectedLocation.lat;
        databaseLng = selectedLocation.lng;
      } else if (instantPolygon && instantPolygon.length > 0) {
        const latSum = instantPolygon.reduce((sum, pt) => sum + pt[0], 0);
        const lngSum = instantPolygon.reduce((sum, pt) => sum + pt[1], 0);
        databaseLat = latSum / instantPolygon.length;
        databaseLng = lngSum / instantPolygon.length;
      }

      const emergencyReport: Report = {
        ...emptyReport,
        reportDate: getCurrentDateTimeString(),
        respondentType: emergencyRespondent as any,
        tribeName: emergencyTribe as any,
        address: serializedAddress,
        lat: databaseLat,
        lng: databaseLng,
        photos: uploadedPhotos,
        hasLandDamage: "否",
        hasBuildingDamage: "否",
      };

      await onAddReport(emergencyReport);

      // 重設即時填報狀態
      setInstantType("");
      setInstantDesc("");
      setEmergencyRespondent("");
      setEmergencyTribe("");
      setEmergencyFiles([]);
      setIsEmergencyConsentChecked(false);
      if (onPolygonClear) {
        onPolygonClear();
      }
    } catch (error) {
      console.error("即時表單送出失敗：", error);
      alert("送出失敗，請查看 Console");
    } finally {
      setIsEmergencySubmitting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length + selectedFiles.length > 3) {
        alert("最多只能上傳三張照片");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...filesArray].slice(0, 3));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
      {/* 填報模式標籤頁切換 */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#f1f5f9",
          padding: "4px",
          borderRadius: "14px",
          marginBottom: "20px",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("detailed")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "10px",
            border: "none",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.25s",
            backgroundColor: activeTab === "detailed" ? "#ffffff" : "transparent",
            color: activeTab === "detailed" ? "#2563eb" : "#64748b",
            boxShadow: activeTab === "detailed" ? "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>📋</span> 一般災情詳細填報
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emergency")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "10px",
            border: "none",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.25s",
            backgroundColor: activeTab === "emergency" ? "#ffffff" : "transparent",
            color: activeTab === "emergency" ? "#dc2626" : "#64748b",
            boxShadow: activeTab === "emergency" ? "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>🚨</span> 即時災情快速填報
        </button>
      </div>

      {activeTab === "detailed" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
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
            className="step-indicator-wrapper"
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


          {currentStep === "basic" && (
            <div>
              <h3 style={sectionTitleStyle}>基本資料</h3>
              <p style={sectionDescStyle}>
                請先填寫受災地點與基本土地資訊，並決定是否有土地與建物受災。
              </p>

              <div style={{ display: "grid", gap: "14px" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#64748b" }}>
                  請先在地圖點選位置，系統會自動帶入經緯度。
                </p>

                <div className="lat-lng-grid">
                  <label style={labelStyle}>
                    經度
                    <input
                      style={fieldStyle}
                      type="number"
                      step="any"
                      name="lng"
                      value={formData.lng ?? ""}
                      onChange={handleChange}
                      placeholder="請選點"
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
                      value={formData.lat ?? ""}
                      onChange={handleChange}
                      placeholder="請選點"
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    />
                  </label>
                </div>

                <label style={labelStyle}>
                  資料日期與時間
                  <input
                    style={{
                      ...fieldStyle,
                      backgroundColor: "#f8fafc",
                      color: "#475569",
                      cursor: "not-allowed",
                    }}
                    type="text"
                    name="reportDate"
                    value={formData.reportDate}
                    readOnly
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
                    <option value="">請選擇</option>
                    <option value="大馬村居民">大馬村居民</option>
                    <option value="大平村居民">大平村居民</option>
                    <option value="北富村居民">北富村居民</option>
                    <option value="南富村居民">南富村居民</option>
                    <option value="西富村居民">西富村居民</option>
                    <option value="大華村居民">大華村居民</option>
                    <option value="大全村居民">大全村居民</option>
                    <option value="大興村居民">大興村居民</option>
                    <option value="大同村居民">大同村居民</option>
                    <option value="大進村居民">大進村居民</option>
                    <option value="東富村居民">東富村居民</option>
                    <option value="馬遠村居民">馬遠村居民</option>
                    <option value="明利村居民">明利村居民</option>
                    <option value="長橋里居民">長橋里居民</option>
                    <option value="其它地區居民">其它地區居民</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  屬於哪個部落？
                  <select
                    style={fieldStyle}
                    name="tribeName"
                    value={formData.tribeName}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
                    <option value="Fata'an（馬太鞍）">Fata'an（馬太鞍）</option>
                    <option value="Atomo（阿陶莫）">Atomo（阿陶莫）</option>
                    <option value="Tafalong（太巴塱）">Tafalong（太巴塱）</option>
                    <option value="Fahol（馬佛）">Fahol（馬佛）</option>
                    <option value="Kalotong（加里洞）">Kalotong（加里洞）</option>
                    <option value="無">無</option>
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
                    placeholder="請輸入地址（非必填）"
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
                    placeholder="請輸入地號（非必填）"
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
                    <option value="使用權人">使用權人</option>
                    <option value="所有權人">所有權人</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  目前泥沙堆積高度
                  <select
                    style={fieldStyle}
                    name="landMudHeight"
                    value={formData.landMudHeight}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
                    <option value="到腳踝">到腳踝</option>
                    <option value="到小腿">到小腿</option>
                    <option value="到膝蓋">到膝蓋</option>
                    <option value="到身體">到身體</option>
                    <option value="超過人">超過人</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  土地受災程度
                  <select
                    style={fieldStyle}
                    name="landDamageLevel"
                    value={formData.landDamageLevel}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
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
                    <option value="">請選擇</option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  建物災時淹水高度
                  <select
                    style={fieldStyle}
                    name="buildingFloodHeight"
                    value={formData.buildingFloodHeight}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
                    <option value="到腳踝">到腳踝</option>
                    <option value="到小腿">到小腿</option>
                    <option value="到膝蓋">到膝蓋</option>
                    <option value="到身體">到身體</option>
                    <option value="超過人">超過人</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  建物目前泥沙堆積高度
                  <select
                    style={fieldStyle}
                    name="buildingMudHeight"
                    value={formData.buildingMudHeight}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
                    <option value="到腳踝">到腳踝</option>
                    <option value="到小腿">到小腿</option>
                    <option value="到膝蓋">到膝蓋</option>
                    <option value="到身體">到身體</option>
                    <option value="超過人">超過人</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  建物受災程度
                  <select
                    style={fieldStyle}
                    name="buildingDamageLevel"
                    value={formData.buildingDamageLevel}
                    onChange={handleChange}
                  >
                    <option value="">請選擇</option>
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

          {isLastStep && (
            <div style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
            }}>
              <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#1e293b", fontSize: "15px" }}>上傳災情照片（最多 3 張）</div>
                <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#64748b" }}>提供現場照片能幫助我們更精準地掌握災情狀況。</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={selectedFiles.length >= 3 || isSubmitting}
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    fontSize: "14px"
                  }}
                />
                {selectedFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#334155" }}>
                        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600
                          }}
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "12px", fontSize: "14px", color: "#475569" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>[個資告知摘要]</div>
                本系統蒐集您填寫之地址、座標、災情內容等資料，僅供災情調查、空間分析、研究整理及內部管理使用。
              </div>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 600,
                color: "#0f172a"
              }}>
                <input
                  type="checkbox"
                  checked={isConsentChecked}
                  onChange={(e) => setIsConsentChecked(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                我已閱讀並同意個人資料蒐集、處理及利用說明
              </label>
              <div style={{ marginTop: "8px", marginLeft: "26px" }}>
                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#2563eb",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  [查看完整聲明]
                </button>
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
              disabled={(isLastStep && !isConsentChecked) || isSubmitting}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                borderRadius: "12px",
                backgroundColor: ((isLastStep && !isConsentChecked) || isSubmitting) ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: ((isLastStep && !isConsentChecked) || isSubmitting) ? "not-allowed" : "pointer",
                opacity: ((isLastStep && !isConsentChecked) || isSubmitting) ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "上傳中..." : isLastStep ? "送出填報" : "下一步"}
            </button>
          </div>
        </div>
      )}

      {/* 即時災情快速填報表單 */}
      {activeTab === "emergency" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <h3 style={{ ...sectionTitleStyle, color: "#dc2626" }}>即時災情快速填報</h3>
          <p style={sectionDescStyle}>
            用於回報即時積水、道路中斷或危險區域。請先在地圖上點選或【繪製受災範圍】以帶入定位點。
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            
            {/* 多邊形範圍狀態提示區 */}
            {instantPolygon && instantPolygon.length > 0 ? (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#f0fdf4",
                  border: "1.5px solid #bbf7d0",
                  color: "#15803d",
                  fontSize: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                  <span>🟢</span> 已成功圈選災害多邊形範圍
                </div>
                <div style={{ fontSize: "13px", color: "#166534" }}>
                  已選取頂點數：<strong>{instantPolygon.length}</strong> 個。系統已自動計算出中心點 (Centroid) 並設定為主要填報經緯度。
                </div>
                <button
                  type="button"
                  onClick={onPolygonClear}
                  style={{
                    alignSelf: "flex-start",
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#dc2626",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  🗑️ 清除多邊形災害範圍
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#fffbeb",
                  border: "1.5px solid #fde68a",
                  color: "#b45309",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                <span>💡 提示：</span>
                您可以點擊地圖直接選點，或是在地圖上方點選<strong>「📍 開始繪製範圍」</strong>按鈕，圈選出具體的受災多邊形範圍，以便國土服務團進行更細緻的空間圖資整理。
              </div>
            )}

            {/* 經緯度座標 */}
            <div className="lat-lng-grid">
              <label style={labelStyle}>
                經度
                <input
                  style={{ ...fieldStyle, backgroundColor: "#f8fafc", cursor: "not-allowed" }}
                  type={selectedLocation ? "number" : "text"}
                  value={selectedLocation ? selectedLocation.lng : (instantPolygon.length > 0 ? "已成功圈選範圍" : "")}
                  placeholder="請在地圖點選或圈選"
                  readOnly
                />
              </label>

              <label style={labelStyle}>
                緯度
                <input
                  style={{ ...fieldStyle, backgroundColor: "#f8fafc", cursor: "not-allowed" }}
                  type={selectedLocation ? "number" : "text"}
                  value={selectedLocation ? selectedLocation.lat : (instantPolygon.length > 0 ? "（免記錄中心點）" : "")}
                  placeholder="請在地圖點選或圈選"
                  readOnly
                />
              </label>
            </div>

            {/* 災情類型 */}
            <label style={labelStyle}>
              即時災情類型
              <select
                style={fieldStyle}
                value={instantType}
                onChange={(e) => setInstantType(e.target.value)}
              >
                <option value="">請選擇災情類型</option>
                <option value="道路中斷">🚧 道路中斷 / 土石坍方</option>
                <option value="積水淹水">🌊 積水淹水 / 泥沙堆積</option>
                <option value="危險區域">⚠️ 危險區域 / 堰塞湖溢流溢散</option>
                <option value="其它災情">📢 其它即時災情說明</option>
              </select>
            </label>

            {/* 災情說明 */}
            <label style={labelStyle}>
              災情說明與安全提醒
              <textarea
                style={{
                  ...fieldStyle,
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                value={instantDesc}
                onChange={(e) => setInstantDesc(e.target.value)}
                placeholder="請描述現地的受災狀況，以及提醒其他居民不要靠近等安全注意事項..."
              />
            </label>

            {/* 填表人 */}
            <label style={labelStyle}>
              填表人
              <select
                style={fieldStyle}
                value={emergencyRespondent}
                onChange={(e) => setEmergencyRespondent(e.target.value)}
              >
                <option value="">請選擇</option>
                <option value="大馬村居民">大馬村居民</option>
                <option value="大平村居民">大平村居民</option>
                <option value="北富村居民">北富村居民</option>
                <option value="南富村居民">南富村居民</option>
                <option value="西富村居民">西富村居民</option>
                <option value="大華村居民">大華村居民</option>
                <option value="大全村居民">大全村居民</option>
                <option value="大興村居民">大興村居民</option>
                <option value="大同村居民">大同村居民</option>
                <option value="大進村居民">大進村居民</option>
                <option value="東富村居民">東富村居民</option>
                <option value="馬遠村居民">馬遠村居民</option>
                <option value="明利村居民">明利村居民</option>
                <option value="長橋里居民">長橋里居民</option>
                <option value="其它地區居民">其它地區居民</option>
              </select>
            </label>

            {/* 屬於哪個部落？ */}
            <label style={labelStyle}>
              屬於哪個部落？
              <select
                style={fieldStyle}
                value={emergencyTribe}
                onChange={(e) => setEmergencyTribe(e.target.value)}
              >
                <option value="">請選擇</option>
                <option value="Fata'an（馬太鞍）">Fata'an（馬太鞍）</option>
                <option value="Atomo（阿陶莫）">Atomo（阿陶莫）</option>
                <option value="Tafalong（太巴塱）">Tafalong（太巴塱）</option>
                <option value="Fahol（馬佛）">Fahol（馬佛）</option>
                <option value="Kalotong（加里洞）">Kalotong（加里洞）</option>
                <option value="無">無</option>
              </select>
            </label>

            {/* 上傳照片 */}
            <div style={{
              marginTop: "10px",
              padding: "16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
            }}>
              <div style={{ fontWeight: 700, marginBottom: "8px", color: "#1e293b", fontSize: "14px" }}>
                上傳災情照片（最多 3 張，選填）
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const filesArray = Array.from(e.target.files);
                    if (filesArray.length + emergencyFiles.length > 3) {
                      alert("最多只能上傳三張照片");
                      return;
                    }
                    setEmergencyFiles((prev) => [...prev, ...filesArray].slice(0, 3));
                  }
                  e.target.value = "";
                }}
                disabled={emergencyFiles.length >= 3 || isEmergencySubmitting}
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "14px"
                }}
              />
              {emergencyFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {emergencyFiles.map((file, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#334155" }}>
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setEmergencyFiles((prev) => prev.filter((_, i) => i !== index))}
                        disabled={isEmergencySubmitting}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600
                        }}
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 個資宣告與同意 */}
            <div style={{
              padding: "14px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              marginTop: "4px"
            }}>
              <div style={{ marginBottom: "12px", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#1e293b" }}>[個資告知摘要]</div>
                本系統蒐集您填寫之地址、座標、災情內容等資料，僅供災情調查、空間分析、研究整理及內部管理使用。
              </div>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a"
              }}>
                <input
                  type="checkbox"
                  checked={isEmergencyConsentChecked}
                  onChange={(e) => setIsEmergencyConsentChecked(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                我已閱讀並同意個人資料蒐集、處理及利用說明
              </label>
              <div style={{ marginTop: "6px", marginLeft: "26px" }}>
                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#dc2626",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  [查看完整聲明]
                </button>
              </div>
            </div>

            {/* 提交按鈕 */}
            <button
              type="button"
              onClick={handleEmergencySubmit}
              disabled={!isEmergencyConsentChecked || isEmergencySubmitting}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "none",
                borderRadius: "12px",
                backgroundColor: (!isEmergencyConsentChecked || isEmergencySubmitting) ? "#94a3b8" : "#dc2626",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                cursor: (!isEmergencyConsentChecked || isEmergencySubmitting) ? "not-allowed" : "pointer",
                opacity: (!isEmergencyConsentChecked || isEmergencySubmitting) ? 0.7 : 1,
                marginTop: "10px",
                boxShadow: (!isEmergencyConsentChecked || isEmergencySubmitting) ? "none" : "0 4px 6px -1px rgba(220, 38, 38, 0.2)",
                transition: "all 0.2s"
              }}
            >
              {isEmergencySubmitting ? "上傳中..." : "🚨 送出即時填報"}
            </button>
          </div>
        </div>
      )}

      <ConsentModal 
        isOpen={isConsentModalOpen} 
        onClose={() => setIsConsentModalOpen(false)} 
      />
    </div>
  );
}

export default ReportForm;