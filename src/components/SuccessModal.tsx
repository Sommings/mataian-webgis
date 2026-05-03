import { CheckCircle } from "lucide-react";
import type { CSSProperties } from "react";

type SuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reportCount: number;
};

export default function SuccessModal({ isOpen, onClose, reportCount }: SuccessModalProps) {
  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    animation: "fadeIn 0.3s ease-out",
  };

  const modalStyle: CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "36px 32px",
    width: "90%",
    maxWidth: "420px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    textAlign: "center",
    animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const iconContainerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    color: "#22c55e",
    margin: "0 auto 24px",
  };

  const buttonStyle: CSSProperties = {
    marginTop: "28px",
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={iconContainerStyle}>
          <CheckCircle size={40} strokeWidth={2.5} />
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: "24px", color: "#1e293b" }}>
          感謝您的回報！
        </h2>
        <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "16px", lineHeight: 1.6 }}>
          您的資料已成功寫入系統。
        </p>
        <p style={{ margin: 0, color: "#475569", fontSize: "16px", lineHeight: 1.6 }}>
          您剛完成了第 <strong style={{ color: "#2563eb", fontSize: "20px" }}>{reportCount}</strong> 筆災情標注，
          <br />這將對未來的重建規劃帶來巨大幫助！
        </p>
        <button 
          style={buttonStyle} 
          onClick={onClose}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
        >
          返回地圖
        </button>
      </div>
    </div>
  );
}
