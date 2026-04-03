"use client";

interface CheckItemProps {
  label: string;
  passed: boolean;
  detail?: string;
  score?: number;
}

export function CheckItem({ label, passed, detail, score }: CheckItemProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/50 last:border-0">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
      }`}>
        {passed ? "✓" : "✗"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-200 font-medium">{label}</span>
          {score !== undefined && (
            <span className={`text-xs font-bold shrink-0 ${score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {score}
            </span>
          )}
        </div>
        {detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  );
}
