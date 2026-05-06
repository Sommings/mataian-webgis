import type { CSSProperties } from "react";

type ConsentModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function ConsentModal({ isOpen, onClose }: ConsentModalProps) {
  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  };

  const modalStyle: CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  };

  const contentStyle: CSSProperties = {
    overflowY: "auto",
    paddingRight: "8px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#334155",
  };

  const buttonStyle: CSSProperties = {
    marginTop: "20px",
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px 0", color: "#1f2d3d", fontSize: "20px" }}>
          個人資料蒐集、處理及利用告知暨同意聲明
        </h3>

        <div style={contentStyle}>
          <p>歡迎使用「花蓮光復鄉／馬太鞍災情填報地圖」系統。為辦理災情填報、空間定位、資料整理、統計分析、研究調查及後續成果整理之需要，我們將蒐集您於本系統中所填寫或提供之相關資料。為保障您的權益，特依個人資料保護相關規定，向您告知下列事項：</p>

          <h4>一、蒐集單位</h4>
          <p>本系統資料之蒐集、處理及管理單位為：<br />政大國土服務團</p>

          <h4>二、蒐集目的</h4>
          <p>本系統蒐集資料之目的，係作為：</p>
          <ul>
            <li>災情通報與位置標示</li>
            <li>土地與建物受災情形整理</li>
            <li>空間分布分析與統計彙整</li>
            <li>研究調查、成果報告及內部管理使用</li>
            <li>必要時之後續聯繫、資料比對與研究分析作業</li>
          </ul>
          <p>所蒐集資料僅於前述目的必要範圍內使用，不作與蒐集目的無關之用途。</p>

          <h4>三、蒐集之資料類別</h4>
          <p>本系統可能蒐集之資料包括但不限於：</p>
          <ul>
            <li>填報基本資料：填報日期、填表人類型、部落別、地址、地點名稱</li>
            <li>空間資訊：地圖點位、經緯度、土地位置資訊</li>
            <li>災情資訊：土地與建物受災情形、泥沙堆積、淹水高度、建物型態、受損程度等</li>
            <li>留言或補充說明資料</li>
            <li>系統使用紀錄：填報時間、系統操作紀錄及其他為維持系統安全所必要之資料</li>
          </ul>

          <h4>四、利用期間、地區、對象及方式</h4>
          <ul>
            <li>期間：自您提供資料起，至蒐集目的消失、研究計畫結束、系統停止使用，或依相關法令及內部管理規定保存期限屆滿時止。</li>
            <li>地區：中華民國境內，及本系統採用之雲端服務或資料儲存所在地。</li>
            <li>對象：本專案主辦單位、研究團隊成員、受委託之資訊服務提供者，以及依法有權調閱之機關。</li>
            <li>方式：以自動化或非自動化方式蒐集、記錄、儲存、整理、分析、統計及利用。</li>
          </ul>

          <h4>五、資料利用原則與保護措施</h4>
          <p>您所提供之資料，將僅供本專案之災情調查、研究分析、空間彙整與內部作業使用。我們將採取合理之技術性及管理性保護措施，以防止資料遭未經授權之存取、洩漏、竄改、毀損或其他侵害情形。除法令另有規定或有正當法律依據外，不會任意將可直接識別個人身分之資料揭露予無關第三人。</p>

          <h4>六、研究成果呈現方式</h4>
          <p>本系統蒐集之資料，原則上將以去識別化、統計化、彙整化或空間分析方式呈現於研究成果、報告或內部簡報中，避免直接公開足以識別特定個人身分之資訊。</p>

          <h4>七、當事人權利</h4>
          <p>依個人資料保護法規定，您得就本人之個人資料，向資料管理單位行使下列權利：</p>
          <ul>
            <li>查詢或請求閱覽</li>
            <li>請求製給複製本</li>
            <li>請求補充或更正</li>
            <li>請求停止蒐集、處理或利用</li>
            <li>請求刪除</li>
          </ul>
          <p>惟如因法令規定、執行職務或研究保存必要而無法立即辦理者，不在此限。</p>

          <h4>八、資料提供之自願性</h4>
          <p>您可自由決定是否提供相關資料；惟若您不同意提供必要資料，或所提供資料不完整、不正確，可能導致本系統無法完成災情填報、位置判讀、後續分析或必要聯繫。</p>

          <h4>九、第三人資料提醒</h4>
          <p>若您於填報過程中提供涉及第三人之資訊，請盡量避免填寫與本系統蒐集目的無關之敏感個資，並確認該等資訊之提供具有適當基礎。</p>

          <h4>十、同意聲明</h4>
          <p>本人已閱讀並瞭解上述個人資料蒐集、處理及利用告知內容，並同意提供本人於本系統中填寫之資料，供本專案於前述目的範圍內蒐集、處理及利用。</p>
        </div>

        <button style={buttonStyle} onClick={onClose}>
          我已閱讀完畢，關閉視窗
        </button>
      </div>
    </div>
  );
}

export default ConsentModal;