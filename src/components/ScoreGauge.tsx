"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const color = scoreColor(score);
  const r = size === "lg" ? 52 : size === "sm" ? 32 : 42;
  const cx = r + 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const svgSize = (r + 8) * 2;
  const strokeWidth = size === "lg" ? 8 : size === "sm" ? 5 : 6;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={svgSize} height={svgSize} className="rotate-[-90deg]">
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold ${size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl"}`}
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <p className={`font-medium text-slate-300 text-center ${size === "sm" ? "text-xs" : "text-sm"}`}>{label}</p>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${size !== "sm" ? "block" : "hidden"}`}
        style={{ backgroundColor: color + "22", color }}
      >
        {scoreLabel(score)}
      </span>
    </div>
  );
}
