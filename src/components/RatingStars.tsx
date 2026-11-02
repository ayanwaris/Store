import { Star } from "lucide-react";
import { cn, fmtNum } from "@/lib/utils";

export default function RatingStars({
  value, count, size = 13, className,
}: {
  value: number; count?: number; size?: number; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={0}
            className={i <= Math.round(value) ? "fill-amber-400" : "fill-line text-line"}
            style={i > Math.round(value) ? { fill: "#2a3050" } : undefined}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-amber-200">{value.toFixed(1)}</span>
      {count != null && <span className="text-xs text-faint">({fmtNum(count)})</span>}
    </span>
  );
}
