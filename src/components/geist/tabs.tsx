"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function Tabs({ items, value, defaultValue, onChange }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value !== undefined ? value : internal;
  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };
  return (
    <div className="geist-tabs" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          className="geist-tab"
          data-active={active === it.value ? "true" : "false"}
          data-disabled={it.disabled ? "true" : "false"}
          aria-selected={active === it.value}
          disabled={it.disabled}
          onClick={() => !it.disabled && select(it.value)}
        >
          {it.label}
          {it.count != null && <span className="geist-tab__count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
