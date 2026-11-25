export type AppMode = "query" | "report" | "story";

const MODES: { id: AppMode; label: string }[] = [
  { id: "query", label: "查詢模式" },
  { id: "report", label: "回報災情" },
  { id: "story", label: "故事地圖" },
];

type AppHeaderProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onOpenAbout: () => void;
  loading: boolean;
};

export default function AppHeader({ mode, onModeChange, onOpenAbout, loading }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-header-title">
        <span className="title-full">花蓮馬太鞍溪堰塞湖災害參與式地圖</span>
        <span className="title-short">馬太鞍溪災害參與式地圖</span>
      </h1>

      <nav className="mode-tabs" aria-label="模式">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-tab${mode === m.id ? " active" : ""}`}
            aria-pressed={mode === m.id}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>

      <div className="app-header-right">
        {loading && <span className="header-loading-text">資料載入中...</span>}
        <button type="button" className="header-link" onClick={onOpenAbout}>
          關於
        </button>
      </div>
    </header>
  );
}
