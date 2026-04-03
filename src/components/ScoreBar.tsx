"use client";

interface ScoreBarProps {
  label: string;
  score: number;
  issues?: string[];
}

export function ScoreBar({ label, score, issues }: ScoreBarProps) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-300">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/100</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      {issues && issues.length > 0 && (
        <ul className="space-y-0.5">
          {issues.slice(0, 2).map((issue, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
