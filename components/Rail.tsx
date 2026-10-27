"use client";

import { motion } from "motion/react";
import {
  ChartLine,
  Clock,
  Coins,
  Flame,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sword,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { ViewId } from "@/lib/views";
import { VIEW_LABELS, VIEW_SHORT } from "@/lib/views";
import { spring } from "@/lib/motion";

const VIEW_ICONS: Record<ViewId, LucideIcon> = {
  home: Home,
  quests: Sword,
  progress: ChartLine,
  focus: Clock,
  lair: Flame,
};

/* Two groups, because the five destinations are not the same kind of thing:
   four are work, one is the game layer. */
const GROUPS: { label: string; items: ViewId[] }[] = [
  { label: "Workspace", items: ["home", "quests", "progress", "focus"] },
  { label: "Campaign", items: ["lair"] },
];

interface RailProps {
  view: ViewId;
  onSelect: (view: ViewId) => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onOpenCapture: () => void;
  onOpenSearch: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts: Partial<Record<ViewId, number>>;
}

export default function Rail({
  view,
  onSelect,
  onOpenSettings,
  onOpenShop,
  onOpenCapture,
  onOpenSearch,
  collapsed,
  onToggleCollapse,
  counts,
}: RailProps) {
  const { state, level, streak } = useStore();

  return (
    <aside className="rail" aria-label="Primary" data-collapsed={collapsed || undefined}>
      <div className="rail-top">
        <a className="rail-brand" href="#main">
          <span className="rail-brand-mark" aria-hidden>
            <Sword size={15} />
          </span>
          <span className="rail-brand-name">
            Task<span>Sphere</span>
          </span>
        </a>
        <button
          type="button"
          className="rail-collapse"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar (Alt+B)" : "Collapse sidebar (Alt+B)"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <button type="button" className="rail-capture" onClick={onOpenCapture} title="Add a quest">
        <Plus size={15} aria-hidden />
        <span>New quest</span>
      </button>

      <button type="button" className="rail-search" onClick={onOpenSearch} aria-label="Search quests and actions">
        <Search size={14} aria-hidden />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>

      {GROUPS.map((group) => (
        <div className="rail-group" key={group.label}>
          <p className="rail-label">{group.label}</p>
          <nav className="rail-nav" aria-label={group.label}>
            {group.items.map((id) => {
              const Icon = VIEW_ICONS[id];
              const active = id === view;
              return (
                <button
                  key={id}
                  type="button"
                  className="rail-item"
                  data-active={active}
                  onClick={() => onSelect(id)}
                  aria-current={active ? "page" : undefined}
                  title={VIEW_LABELS[id]}
                >
                  {active && (
                    <motion.span
                      layoutId="rail-active"
                      className="rail-active"
                      transition={{ ...spring, stiffness: 380, damping: 34 }}
                    />
                  )}
                  <Icon size={16} aria-hidden className="rail-icon" />
                  <span className="rail-text">{VIEW_LABELS[id]}</span>
                  <span className="rail-text-short" aria-hidden>
                    {VIEW_SHORT[id]}
                  </span>
                  {id === "quests" && counts.quests ? (
                    <span className="rail-count">{counts.quests}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="rail-bottom">
        <button type="button" className="rail-item" onClick={onOpenShop} title="Reward store">
          <Coins size={16} aria-hidden className="rail-icon" />
          <span className="rail-text">Reward store</span>
          {state.gold > 0 && <span className="rail-count">{state.gold}</span>}
        </button>

        <button type="button" className="rail-item" onClick={onOpenSettings} title="Settings">
          <Settings size={16} aria-hidden className="rail-icon" />
          <span className="rail-text">Settings</span>
        </button>

        <div className="rail-user" title={`${level.name} · ${streak}-day streak · ${state.gold} gold`}>
          <span className="rail-avatar" aria-hidden>
            {level.level}
          </span>
          <span className="min-w-0">
            <strong className="rail-user-name">{level.name}</strong>
            <small className="rail-user-meta">
              {streak}d streak · {state.gold} gold
            </small>
          </span>
        </div>
      </div>
    </aside>
  );
}
