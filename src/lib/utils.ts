import { randomUUID } from "crypto";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const fmtEUR = (n: number | string) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(n));

export const fmtNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(d: Date | string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function orderNumber() {
  return `KH-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export function token() {
  return randomUUID().replace(/-/g, "") + randomUUID().slice(0, 8);
}

export const PLATFORMS = ["Vapor", "PlayZone", "XCore", "Orbit", "SwitchUp", "RockSocial", "PC"] as const;
export const REGIONS = ["GLOBAL", "EU", "US", "LATAM", "ASIA"] as const;
export const KINDS = ["game", "giftcard", "software", "subscription", "points", "dlc"] as const;

export const KIND_LABEL: Record<string, string> = {
  game: "Game",
  giftcard: "Gift Card",
  software: "Software",
  subscription: "Subscription",
  points: "Points",
  dlc: "Add-on",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  completed: "Completed",
  cancelled: "Cancelled",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

export function statusTone(status: string) {
  switch (status) {
    case "completed": case "delivered": case "approved": case "paid": case "succeeded": case "open":
      return "text-emerald-300 bg-emerald-400/10 border-emerald-400/20";
    case "pending_payment": case "pending": case "awaiting_payment": case "initiated":
      return "text-amber-300 bg-amber-400/10 border-amber-400/20";
    case "cancelled": case "failed": case "rejected": case "suspended": case "revoked":
      return "text-rose-300 bg-rose-400/10 border-rose-400/20";
    default:
      return "text-sky-300 bg-sky-400/10 border-sky-400/20";
  }
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEY_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function genKey(rand: () => number = Math.random) {
  const seg = () =>
    Array.from({ length: 5 }, () => KEY_CHARSET[Math.floor(rand() * KEY_CHARSET.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}
