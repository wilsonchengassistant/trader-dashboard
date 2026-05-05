// src/components/ApiStatusIndicator.tsx
import { USE_REAL_API } from "../api";

export default function ApiStatusIndicator() {
  const isLive = USE_REAL_API;

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        Data Source
      </span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-tight ${
          isLive ? "text-green-500" : "text-slate-400"
        }`}
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            isLive
              ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"
              : "bg-slate-500"
          }`}
        />
        {isLive ? "LIVE" : "MOCK"}
      </span>
    </div>
  );
}
