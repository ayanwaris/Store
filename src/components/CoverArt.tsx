import { Gamepad2, Gift, AppWindow, BadgeCheck, Coins, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<string, typeof Gamepad2> = {
  game: Gamepad2, giftcard: Gift, software: AppWindow, subscription: BadgeCheck, points: Coins, dlc: Puzzle,
};

/**
 * Procedural, original cover art — deterministic from title + hue.
 * Zero stock/copyrighted imagery; scales to any catalog size.
 */
export default function CoverArt({
  title, hue, platform, kind, className, rounded = "rounded-xl",
}: {
  title: string; hue: number; platform?: string; kind?: string;
  className?: string; rounded?: string;
}) {
  const Icon = KIND_ICON[kind ?? "game"] ?? Gamepad2;
  const words = title.split(/[\s:—-]+/).filter(Boolean);
  const initials = (words[0]?.[0] ?? "K") + (words[1]?.[0] ?? "");
  const angle = (hue * 7) % 135 + 100;
  return (
    <div
      className={cn("relative overflow-hidden select-none", rounded, className)}
      style={{
        background: `linear-gradient(${angle}deg, hsl(${hue} 65% 16%) 0%, hsl(${(hue + 40) % 360} 70% 10%) 55%, #0a0c16 100%)`,
      }}
    >
      {/* grid lines */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(160deg, black, transparent 70%)",
        }}
      />
      {/* glow orb */}
      <div
        className="absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl opacity-60"
        style={{ background: `hsl(${hue} 90% 55% / 0.5)` }}
      />
      <Icon
        className="absolute -bottom-5 -right-4 h-28 w-28 opacity-15 -rotate-12"
        style={{ color: `hsl(${hue} 95% 70%)` }}
        strokeWidth={1}
      />
      {/* initials */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display font-bold tracking-tight text-white/95"
          style={{
            fontSize: "clamp(2rem, 22cqw, 3.4rem)",
            textShadow: `0 10px 40px hsl(${hue} 90% 50% / 0.6)`,
            containerType: "inline-size",
          }}
        >
          {initials}
        </span>
      </div>
      {/* title ribbon */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/90">{title}</p>
        {platform && (
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: `hsl(${hue} 95% 72%)` }}>
            {platform}
          </p>
        )}
      </div>
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[inherit]" style={{ borderRadius: "inherit" }} />
    </div>
  );
}
