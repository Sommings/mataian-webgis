import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Message = {
  id: number;
  content: string;
  created_at: string;
  nickname?: string;
  avatar?: string;
};

const ANIMAL_AVATARS = ["🐸", "🐻", "🦌", "🐗", "🐒", "🦉", "🐈", "🐟", "🦆"];

const PRESET_MESSAGES = [
  "馬太鞍辛苦了！",
  "我們一起加油！",
  "我愛馬太鞍！我們是一家人！",
  "重建之路不孤單，我們都在！",
  "願平安與勇氣與馬太鞍同在！",
  "天佑馬太鞍，早日恢復美麗家園！",
];

export default function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMessages();

    // 訂閱即時更新 (如果有的話)
    const subscription = supabase
      .channel("messages_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
  console.error("讀取 messages 失敗：", error);
  return;
}

      if (data) setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const finalNickname = nickname.trim() || "匿名好朋友";
    const randomAvatar = ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)];

    const payload = {
      content: newMessage.trim(),
      nickname: finalNickname,
      avatar: randomAvatar,
    };

    try {
      const { error } = await supabase
        .from("messages")
        .insert([payload]);

      if (error) {
  console.error("留言寫入 Supabase 失敗：", error);
  console.log("error.code =", error?.code);
  console.log("error.message =", error?.message);
  console.log("error.details =", error?.details);
  console.log("error.hint =", error?.hint);
  alert("留言沒有成功寫入 Supabase，請查看 Console。");
  setIsSubmitting(false);
  return;
}

      setNewMessage("");
      // 即時更新會透過 subscription 處理，如果沒觸發也可主動 fetch
      fetchMessages();
    } catch (err) {
      console.error("提交失敗：", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetClick = (text: string) => {
    setNewMessage(text);
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "18px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(31, 45, 61, 0.08)",
        marginTop: "24px",
      }}
    >
      <h2 style={{ margin: "0 0 16px 0", fontSize: "22px", color: "#1f2d3d" }}>
        ❤️ 正能量留言板
      </h2>
      <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px" }}>
        在重建的路上，一句溫暖的話語能帶來巨大的力量。留下您的鼓勵吧！
      </p>

      {/* 輸入區塊 */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="您的暱稱 (選填)"
            style={{
              width: "140px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="寫下您的鼓勵..."
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
            style={{
              padding: "0 24px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: isSubmitting || !newMessage.trim() ? "#94a3b8" : "#ec4899",
              color: "white",
              fontWeight: 600,
              cursor: isSubmitting || !newMessage.trim() ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {isSubmitting ? "發送中..." : "送出留言"}
          </button>
        </div>

        {/* 預設正能量按鈕 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRESET_MESSAGES.map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(text)}
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid #fbcfe8",
                backgroundColor: "#fdf2f8",
                color: "#db2777",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#fce7f3";
                e.currentTarget.style.borderColor = "#f9a8d4";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#fdf2f8";
                e.currentTarget.style.borderColor = "#fbcfe8";
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </form>

      {/* 留言列表 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "400px",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: "32px 0" }}>
            目前還沒有留言，來成為第一個送出溫暖的人吧！
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "12px",
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  flexShrink: 0,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                {msg.avatar || "👤"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                    {msg.nickname || "匿名好朋友"}
                  </strong>
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {new Date(msg.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                <p style={{ margin: 0, color: "#334155", fontSize: "15px", lineHeight: 1.5 }}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
