"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coins, ShieldCheck, Sparkles, Store, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useStore, type Purchase } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { useToast } from "@/lib/toast";
import { SHOP_SUPPLIES, SHOP_THEMES } from "@/lib/constants";
import { motionDisabled, popVariants, softSpring } from "@/lib/motion";
import { useTween } from "@/lib/useTween";

export default function ShopSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, level, purchase } = useStore();
  const { push } = useToast();
  const sfx = useSfx();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const reduced = motionDisabled(state.motionLevel);
  const gold = useTween(state.gold, !reduced);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") trapFocus(event, dialogRef.current);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const buy = (item: Purchase) => {
    const result = purchase(item);
    if (result.ok) {
      sfx("claim");
      setJustBought(item.id);
      window.setTimeout(() => setJustBought(null), 900);
    } else {
      sfx("error");
    }
    push(result.message, result.ok ? "success" : "error");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-contain bg-black/60 p-3.5 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Reward store"
        >
          <motion.div
            ref={dialogRef}
            variants={popVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={softSpring}
            onClick={(event) => event.stopPropagation()}
            tabIndex={-1}
            className="panel shop-sheet flex max-h-[min(86dvh,680px)] w-full max-w-[680px] flex-col overflow-hidden p-0"
          >
            <header className="shop-head">
              <div>
                <p className="kicker">Reward store</p>
                <h2 className="shop-title">Spend your gold</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="shop-balance" title="Gold banked from cleared quests">
                  <Coins size={13} aria-hidden />
                  <strong>{Math.round(gold)}</strong>
                  <span>gold</span>
                </span>
                <button type="button" onClick={onClose} aria-label="Close store" className="shop-close">
                  <X size={15} aria-hidden />
                </button>
              </div>
            </header>

            <div className="shop-body">
              <section aria-label="Companion care and shields">
                <p className="kicker">
                  <ShieldCheck size={11} aria-hidden /> Companion &amp; streak
                </p>
                <ul className="shop-rows">
                  {SHOP_SUPPLIES.map((item) => {
                    const spent = justBought === item.id;
                    const soldOut =
                      (item.energy && state.petEnergy >= 100) || (item.shield && state.streakShield);
                    const afford = state.gold >= item.cost;
                    return (
                      <li key={item.id} className="shop-row" data-bought={spent || undefined}>
                        <span className="min-w-0">
                          <strong>{item.name}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <span className="shop-row-side">
                          <span className="shop-price">{item.cost}g</span>
                          <button
                            type="button"
                            onClick={() => buy({ ...item })}
                            disabled={!!soldOut || !afford}
                            className="shop-buy"
                          >
                            {soldOut ? "Ready" : afford ? "Buy" : "Short"}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="shop-note">
                  Energy decays five points for every idle day, so a fed companion is a fed streak.
                  Current energy {state.petEnergy}%.
                </p>
              </section>

              <section aria-label="Accent palettes">
                <p className="kicker">
                  <Sparkles size={11} aria-hidden /> Accent palettes
                </p>
                <ul className="shop-rows">
                  {SHOP_THEMES.map((theme) => {
                    const owned = state.unlockedThemes.includes(theme.id);
                    const equipped = state.theme === theme.id;
                    const reached = level.level >= theme.level;
                    const afford = state.gold >= theme.cost;
                    const label = equipped
                      ? "Equipped"
                      : owned
                        ? "Equip"
                        : !reached
                          ? `Rank ${theme.level}`
                          : afford
                            ? "Unlock"
                            : "Short";
                    return (
                      <li key={theme.id} className="shop-row" data-bought={justBought === theme.id || undefined}>
                        <span className="shop-swatch" style={{ background: `linear-gradient(135deg, ${theme.colors.join(",")})` }} aria-hidden />
                        <span className="min-w-0">
                          <strong>{theme.name}</strong>
                          <small>
                            {theme.cost === 0
                              ? "Starter palette"
                              : `${theme.cost} gold · opens at rank ${theme.level}`}
                          </small>
                        </span>
                        <span className="shop-row-side">
                          {theme.cost > 0 && !owned && <span className="shop-price">{theme.cost}g</span>}
                          <button
                            type="button"
                            className="shop-buy"
                            data-primary={theme.cost === 0 || owned || (reached && afford) || undefined}
                            disabled={
                              equipped || (!owned && (!reached || !afford)) || (theme.cost === 0 && equipped)
                            }
                            onClick={() =>
                              buy({
                                id: theme.id,
                                name: theme.name,
                                cost: theme.cost,
                                skin: theme.id,
                                requiredLevel: theme.level,
                              })
                            }
                          >
                            {label}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="shop-note">
                  Palettes change the workspace accents, not the layout — the Forge ground is always
                  free to go back to.
                </p>
              </section>
            </div>

            <footer className="shop-foot">
              <Store size={12} aria-hidden />
              Gold comes from cleared quests (3 to 8 each) and finished focus sessions (10).
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function trapFocus(event: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return;
  const fields = root.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input, textarea");
  if (fields.length === 0) return;
  const first = fields[0];
  const last = fields[fields.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
