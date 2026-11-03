"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PromoBanner from "@/components/site/PromoBanner";
import {
  AD_SLOT_KEYS, type AdsConfig, type NewsletterConfig, type PromoBanner as PromoConfig,
} from "@/lib/site-config";
import {
  DEFAULT_CUSTOM, DEFAULT_THEME, EDITABLE_GROUPS, EMPTY_OVERRIDES, PRESETS, PRESET_IDS, glassParams, isHex, resolveTheme,
  type ColorSide, type EditableKey, type PresetId, type ThemeSettings, type ThemeTokens,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

async function put(key: string, body: unknown) {
  const res = await fetch(`/api/admin/site/${key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Save failed");
}

function useSaver(key: string, label: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const save = async (body: unknown) => {
    setBusy(true);
    try { await put(key, body); toast.success(`${label} saved`); router.refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };
  return { busy, save };
}

const SaveBtn = ({ busy, onClick, children = "Save" }: { busy: boolean; onClick: () => void; children?: React.ReactNode }) => (
  <button className="btn btn-primary" disabled={busy} onClick={onClick}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {children}</button>
);

/* ---------------------------------- theme ---------------------------------- */

function Swatch({ t, label }: { t: ThemeTokens; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ background: t.bg, borderColor: t.line, color: t.ink }}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: t.panel, color: t.mute }}>
        {label}<span className="h-1.5 w-1.5 rounded-full" style={{ background: t.brand }} />
      </div>
      <div className="space-y-1.5 p-2">
        <div className="rounded-md border p-1.5" style={{ background: t.card, borderColor: t.line }}>
          <div className="h-1.5 w-2/3 rounded" style={{ background: t.ink }} />
          <div className="mt-1 h-1 w-1/2 rounded" style={{ background: t.mute }} />
        </div>
        <div className="rounded-md px-2 py-1 text-center text-[10px] font-bold" style={{ background: `linear-gradient(${t.goldA},${t.goldB})`, color: t.onBrand }}>Button</div>
      </div>
    </div>
  );
}

/** Live glass preview: coloured shapes behind a frosted card, using the exact same maths as the real site. */
function GlassPreview({ tokens, glass }: { tokens: ThemeTokens; glass: number }) {
  const g = glassParams(glass);
  return (
    <div className="relative overflow-hidden rounded-xl border p-5" style={{ background: tokens.bg, borderColor: tokens.line, color: tokens.ink }}>
      <div className="pointer-events-none absolute inset-0" style={{
        opacity: g.orbs,
        background: `radial-gradient(9rem 9rem at 15% 30%, color-mix(in srgb, ${tokens.brand} 60%, transparent), transparent 70%), radial-gradient(10rem 10rem at 85% 60%, color-mix(in srgb, ${tokens.accent2} 55%, transparent), transparent 70%)`,
      }} />
      <div className="relative rounded-xl border p-4" style={{
        background: `color-mix(in srgb, ${tokens.card} ${g.cardPct}%, transparent)`,
        borderColor: `color-mix(in srgb, ${tokens.line} 85%, transparent)`,
        backdropFilter: `blur(${g.blur}px) saturate(${g.sat})`,
        WebkitBackdropFilter: `blur(${g.blur}px) saturate(${g.sat})`,
      }}>
        <p className="font-display font-bold">Frosted card</p>
        <p className="mt-0.5 text-xs" style={{ color: tokens.mute }}>Blur {g.blur}px · card opacity {g.cardPct}% · shapes {Math.round(g.orbs * 100)}%</p>
        <div className="mt-3 inline-block rounded-md px-3 py-1 text-xs font-bold" style={{ background: `linear-gradient(${tokens.goldA},${tokens.goldB})`, color: tokens.onBrand }}>Button</div>
      </div>
    </div>
  );
}

const OFFWHITE_WARM: ColorSide = { bg: "#faf7f0", panel: "#f3eee1", card: "#fffdf8", raised: "#ece5d2", line: "#e0d6ba", lineSoft: "#eae2cb" };
const OFFWHITE_COOL: ColorSide = { bg: "#f6f6f3", panel: "#eeeeea", card: "#fcfcfa", raised: "#e6e7e4", line: "#d9dbd8", lineSoft: "#e5e6e3" };

function ColorRow({ label, hint, value, base, edited, onChange, onReset }: {
  label: string; hint: string; value: string; base: string; edited: boolean; onChange: (v: string) => void; onReset: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null); // what the user is typing in the hex box
  const text = draft ?? value;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line p-2" title={hint}>
      <input type="color" aria-label={label} className="h-9 w-11 shrink-0 cursor-pointer rounded border border-line bg-transparent" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{label}{edited && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" title="Edited" />}</p>
        <input className="input mt-0.5 !px-2 !py-1 font-mono text-xs uppercase" maxLength={7} value={text} aria-label={`${label} hex`}
          onChange={(e) => { const v = e.target.value.trim(); setDraft(v); if (isHex(v)) onChange(v.toLowerCase()); }}
          onBlur={() => setDraft(null)} />
      </div>
      <button type="button" className="btn btn-ghost btn-sm px-2" disabled={!edited} onClick={onReset} title={`Reset to preset (${base})`} aria-label={`Reset ${label}`}><RotateCcw size={13} /></button>
    </div>
  );
}

function ThemeTab({ initial }: { initial: ThemeSettings }) {
  const [t, setT] = useState<ThemeSettings>(initial);
  const [side, setSide] = useState<"light" | "dark">("light");
  const { busy, save } = useSaver("theme", "Theme");
  const r = useMemo(() => resolveTheme(t), [t]);
  const base = useMemo(() => resolveTheme(t, false), [t]);
  const tokens = side === "light" ? r.light : r.dark;
  const baseTokens = side === "light" ? base.light : base.dark;
  const edits = t.overrides[side];
  const editedCount = Object.keys(t.overrides.light).length + Object.keys(t.overrides.dark).length;

  const setColor = (k: EditableKey, v: string) => setT({ ...t, overrides: { ...t.overrides, [side]: { ...edits, [k]: v } } });
  const resetColor = (k: EditableKey) => {
    const next = { ...edits }; delete next[k];
    setT({ ...t, overrides: { ...t.overrides, [side]: next } });
  };
  const pickPreset = (id: PresetId) => setT({ ...t, preset: id, mode: "preset", overrides: EMPTY_OVERRIDES });

  const customColor = (k: keyof typeof DEFAULT_CUSTOM, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="color" className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent" value={t.custom[k] as string}
        onChange={(e) => setT({ ...t, custom: { ...t.custom, [k]: e.target.value } })} />
      {label}
    </label>
  );
  const modeValue = t.preset === "custom" ? t.custom.mode : t.mode;
  const setMode = (v: string) => (t.preset === "custom"
    ? setT({ ...t, custom: { ...t.custom, mode: v as never } })
    : setT({ ...t, mode: v as never }));

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="font-display font-bold">1 · Theme preset (starting point)</h3>
        <p className="mt-1 text-xs text-faint">Pick a base look. Every preset is fully editable in step 2 — change any colour, including off-white backgrounds. Choosing another preset clears your hand edits.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRESET_IDS.map((id: PresetId) => {
            const res = resolveTheme({ ...t, preset: id, mode: "preset", overrides: EMPTY_OVERRIDES });
            const active = t.preset === id;
            const shown = active ? r : res;
            const label = id === "custom" ? "Custom theme" : PRESETS[id].label;
            const desc = id === "custom" ? "Pick your own accent and base colours for light and dark." : PRESETS[id].description;
            return (
              <button key={id} type="button" onClick={() => pickPreset(id)} aria-pressed={active}
                className={cn("rounded-xl border p-3 text-left transition", active ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-brand/40")}>
                <div className="grid grid-cols-2 gap-2"><Swatch t={shown.light} label="Light" /><Swatch t={shown.dark} label="Dark" /></div>
                <p className="mt-2.5 text-sm font-bold">{label}{active && <span className="ml-2 text-[10px] font-bold uppercase text-brand">Active{editedCount > 0 ? " · edited" : ""}</span>}</p>
                <p className="mt-0.5 text-xs text-faint">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">2 · Edit colours {editedCount > 0 && <span className="text-xs font-normal text-faint">({editedCount} edited)</span>}</h3>
            <p className="mt-1 text-xs text-faint">Change any colour of the active theme. A dot marks edited colours; the arrow button restores the preset value.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">Light / dark behaviour
            <select className="select max-w-48" value={modeValue} onChange={(e) => setMode(e.target.value)}>
              {t.preset !== "custom" && <option value="preset">Preset default</option>}
              <option value="auto">Follow visitor&apos;s device</option><option value="light">Always light</option><option value="dark">Always dark</option>
            </select>
          </label>
        </div>

        {t.preset === "custom" && (
          <div className="mt-4 grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
            <div className="space-y-2"><p className="text-xs font-bold uppercase text-faint">Accent</p>{customColor("accent", "Accent")}</div>
            <div className="space-y-2"><p className="text-xs font-bold uppercase text-faint">Light base</p>{customColor("lightBg", "Background")}{customColor("lightSurface", "Cards")}{customColor("lightInk", "Text")}</div>
            <div className="space-y-2"><p className="text-xs font-bold uppercase text-faint">Dark base</p>{customColor("darkBg", "Background")}{customColor("darkSurface", "Cards")}{customColor("darkInk", "Text")}</div>
            <p className="text-xs text-faint sm:col-span-3">Custom derives every shade from these; you can still fine-tune individual colours below.</p>
          </div>
        )}

        <div role="tablist" className="mt-4 flex flex-wrap items-center gap-2">
          {(["light", "dark"] as const).map((s) => (
            <button key={s} role="tab" aria-selected={side === s} onClick={() => setSide(s)}
              className={cn("rounded-lg border px-3 py-1.5 text-sm font-semibold transition", side === s ? "border-brand bg-brand/10 text-brand" : "border-line text-mute hover:text-ink")}>
              {s === "light" ? "Light mode colours" : "Dark mode colours"}{Object.keys(t.overrides[s]).length > 0 && ` · ${Object.keys(t.overrides[s]).length}`}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          {side === "light" && <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setT({ ...t, overrides: { ...t.overrides, light: { ...t.overrides.light, ...OFFWHITE_WARM } } })}>Warm off-white</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setT({ ...t, overrides: { ...t.overrides, light: { ...t.overrides.light, ...OFFWHITE_COOL } } })}>Cool off-white</button>
          </>}
          <button type="button" className="btn btn-ghost btn-sm" disabled={Object.keys(edits).length === 0} onClick={() => setT({ ...t, overrides: { ...t.overrides, [side]: {} } })}>Reset {side} edits</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={editedCount === 0} onClick={() => setT({ ...t, overrides: EMPTY_OVERRIDES })}>Reset all edits</button>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            {EDITABLE_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-faint">{g.title}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((it) => (
                    <ColorRow key={`${side}-${it.key}`} label={it.label} hint={it.hint} value={tokens[it.key]} base={baseTokens[it.key]}
                      edited={!!edits[it.key]} onChange={(v) => setColor(it.key, v)} onReset={() => resetColor(it.key)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-wider text-faint">Live preview</p>
            <Swatch t={r.light} label="Light" />
            <Swatch t={r.dark} label="Dark" />
          </div>
        </div>
      </div>

      <div className="card grid gap-5 p-5 md:grid-cols-2">
        <div>
          <h3 className="font-display font-bold">3 · Glass intensity: {t.glass}</h3>
          <p className="mt-1 text-xs text-faint">0 = solid surfaces. Higher = more translucent, blurred cards and navbar over soft coloured shapes. Try 0 vs 100 in the preview.</p>
          <input type="range" min={0} max={100} value={t.glass} aria-label="Glass intensity" onChange={(e) => setT({ ...t, glass: Number(e.target.value) })} className="mt-3 w-full accent-[var(--kh-brand)]" />
          <h3 className="mt-5 font-display font-bold">Corner style</h3>
          <select className="select mt-2 max-w-56" value={t.radius} onChange={(e) => setT({ ...t, radius: e.target.value as never })}>
            <option value="sharp">Sharp</option><option value="soft">Soft (default)</option><option value="round">Round</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <GlassPreview tokens={r.light} glass={t.glass} />
          <GlassPreview tokens={r.dark} glass={t.glass} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SaveBtn busy={busy} onClick={() => save(t)}>Save theme</SaveBtn>
        <button className="btn btn-outline" onClick={() => setT(DEFAULT_THEME)}><RotateCcw size={14} /> Reset to White &amp; Gold</button>
      </div>
    </div>
  );
}

/* ------------------------------ promo banner ------------------------------ */

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function BannerTab({ initial }: { initial: PromoConfig }) {
  const [p, setP] = useState(initial);
  const { busy, save } = useSaver("promo_banner", "Promotional banner");
  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} /> Show the banner above the navbar</label>
        <div><label className="label">Text</label><input className="input" maxLength={200} value={p.text} onChange={(e) => setP({ ...p, text: e.target.value })} placeholder="Free instant delivery on every order this week" /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Link (optional)</label><input className="input" value={p.linkUrl} onChange={(e) => setP({ ...p, linkUrl: e.target.value })} placeholder="/search?sort=discount or https://…" /></div>
          <div><label className="label">Link label</label><input className="input" maxLength={40} value={p.linkLabel} onChange={(e) => setP({ ...p, linkLabel: e.target.value })} placeholder="Shop now" /></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div><label className="label">Style</label>
            <select className="select" value={p.style} onChange={(e) => setP({ ...p, style: e.target.value as never })}>
              <option value="gold">Theme accent (gold)</option><option value="dark">Inverted (text colour as background)</option><option value="custom">Custom colours</option>
            </select></div>
          {p.style === "custom" && <>
            <label className="flex items-center gap-2 text-sm">Background <input type="color" className="h-9 w-12 rounded border border-line bg-transparent" value={p.bgColor} onChange={(e) => setP({ ...p, bgColor: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm">Text <input type="color" className="h-9 w-12 rounded border border-line bg-transparent" value={p.textColor} onChange={(e) => setP({ ...p, textColor: e.target.value })} /></label>
          </>}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div><label className="label">Visible to</label>
            <select className="select" value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value as never })}>
              <option value="all">Everyone</option><option value="guests">Signed-out visitors</option><option value="members">Signed-in users</option>
            </select></div>
          <div><label className="label">Starts (optional)</label><input type="datetime-local" className="input" value={toLocal(p.startsAt)} onChange={(e) => setP({ ...p, startsAt: fromLocal(e.target.value) })} /></div>
          <div><label className="label">Ends (optional)</label><input type="datetime-local" className="input" value={toLocal(p.endsAt)} onChange={(e) => setP({ ...p, endsAt: fromLocal(e.target.value) })} /></div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Preview</p>
        <div className="overflow-hidden rounded-xl border border-line">
          {p.text.trim() ? <PromoBanner promo={p} /> : <p className="p-4 text-sm text-faint">Enter some text to preview the banner. With no text (or when disabled) no banner is shown and the navbar sits at the very top.</p>}
        </div>
      </div>
      <SaveBtn busy={busy} onClick={() => save(p)}>Save banner</SaveBtn>
    </div>
  );
}

/* ------------------------------- advertising ------------------------------- */

const SLOT_LABEL: Record<string, string> = { home_top: "Home — top", home_middle: "Home — middle", home_bottom: "Home — bottom" };

function AdsTab({ initial }: { initial: AdsConfig }) {
  const [a, setA] = useState(initial);
  const { busy, save } = useSaver("ads", "Advertising");
  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={a.enabled} onChange={(e) => setA({ ...a, enabled: e.target.checked })} /> Enable Google AdSense</label>
        <div className="max-w-md"><label className="label">Publisher ID</label><input className="input" value={a.publisherId} placeholder="ca-pub-1234567890123456" onChange={(e) => setA({ ...a, publisherId: e.target.value.trim() })} /></div>
        <div className="space-y-2">
          {AD_SLOT_KEYS.map((k) => (
            <div key={k} className="grid items-center gap-3 rounded-xl border border-line p-3 md:grid-cols-[10rem_auto_1fr]">
              <span className="text-sm font-semibold">{SLOT_LABEL[k]}</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.slots[k].enabled} onChange={(e) => setA({ ...a, slots: { ...a.slots, [k]: { ...a.slots[k], enabled: e.target.checked } } })} /> Enabled</label>
              <input className="input" placeholder="Ad unit (slot) ID — digits only" value={a.slots[k].slotId} onChange={(e) => setA({ ...a, slots: { ...a.slots, [k]: { ...a.slots[k], slotId: e.target.value.trim() } } })} />
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-faint">
          <li>An ad section is shown only when AdSense, its placement, the publisher ID and the slot ID are all set. Otherwise the whole section is removed — no empty boxes, no placeholders.</li>
          <li>Attach a placement to the homepage with an &quot;AdSense ad&quot; section in Homepage.</li>
          <li>Before going live: add <code>ads.txt</code> to <code>/public</code>, and make sure your consent banner (required in the EU/UK) is in place. Never ask visitors to click ads.</li>
        </ul>
      </div>
      <SaveBtn busy={busy} onClick={() => save(a)}>Save advertising</SaveBtn>
    </div>
  );
}

/* -------------------------------- newsletter -------------------------------- */

type Sub = { id: string; email: string; status: string; source: string; createdAt: string };

function NewsletterTab({ initial }: { initial: NewsletterConfig }) {
  const [n, setN] = useState(initial);
  const { busy, save } = useSaver("newsletter", "Newsletter");
  const [subs, setSubs] = useState<{ total: number; subscribers: Sub[] } | null>(null);
  const load = useCallback(() => {
    fetch("/api/admin/newsletter")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (json) setSubs(json.data); })
      .catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={n.enabled} onChange={(e) => setN({ ...n, enabled: e.target.checked })} /> Accept newsletter sign-ups (homepage section + footer)</label>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Heading</label><input className="input" maxLength={80} value={n.heading} onChange={(e) => setN({ ...n, heading: e.target.value })} /></div>
          <div><label className="label">Button label</label><input className="input" maxLength={24} value={n.buttonLabel} onChange={(e) => setN({ ...n, buttonLabel: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="label">Description</label><input className="input" maxLength={240} value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} /></div>
          <div><label className="label">Input placeholder</label><input className="input" maxLength={60} value={n.placeholder} onChange={(e) => setN({ ...n, placeholder: e.target.value })} /></div>
          <div><label className="label">Success message</label><input className="input" maxLength={140} value={n.successMessage} onChange={(e) => setN({ ...n, successMessage: e.target.value })} /></div>
        </div>
        <SaveBtn busy={busy} onClick={() => save(n)}>Save newsletter</SaveBtn>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold">Subscribers {subs && <span className="text-faint">({subs.total})</span>}</h3>
          <a className="btn btn-outline btn-sm" href="/api/admin/newsletter?format=csv"><Download size={13} /> Export CSV</a>
        </div>
        <p className="mt-1 text-xs text-faint">Addresses are stored lower-cased and de-duplicated. Latest 500 shown.</p>
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
          <table className="table-x">
            <thead><tr><th>Email</th><th>Source</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {subs?.subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="break-all">{s.email}</td><td>{s.source}</td><td className="whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="text-right"><button className="btn btn-danger btn-sm" aria-label="Remove subscriber" onClick={async () => {
                    if (!confirm(`Remove ${s.email}?`)) return;
                    const res = await fetch(`/api/admin/newsletter?id=${s.id}`, { method: "DELETE" });
                    if (res.ok) { toast.success("Removed"); load(); } else toast.error("Could not remove");
                  }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
              {subs && subs.subscribers.length === 0 && <tr><td colSpan={4} className="text-faint">No subscribers yet.</td></tr>}
              {!subs && <tr><td colSpan={4} className="text-faint">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- shell ----------------------------------- */

const TABS = [
  { id: "theme", label: "Theme" }, { id: "banner", label: "Promo banner" },
  { id: "advertising", label: "Advertising" }, { id: "newsletter", label: "Newsletter" },
] as const;

export default function SiteSettingsClient({ theme, promo, ads, newsletter }: {
  theme: ThemeSettings; promo: PromoConfig; ads: AdsConfig; newsletter: NewsletterConfig;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("theme");
  useEffect(() => {
    // open the tab named in the URL hash (e.g. /admin/site#newsletter) after hydration
    const h = window.location.hash.slice(1);
    if (TABS.some((t) => t.id === h)) queueMicrotask(() => setTab(h as never));
  }, []);
  return (
    <div className="mt-5">
      <div role="tablist" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); history.replaceState(null, "", `#${t.id}`); }}
            className={cn("shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition", tab === t.id ? "border-brand text-brand" : "border-transparent text-mute hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "theme" && <ThemeTab initial={theme} />}
      {tab === "banner" && <BannerTab initial={promo} />}
      {tab === "advertising" && <AdsTab initial={ads} />}
      {tab === "newsletter" && <NewsletterTab initial={newsletter} />}
    </div>
  );
}