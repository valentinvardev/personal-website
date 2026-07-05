"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";

import { Icon } from "~/components/geist";
import { ICONS, type IconName } from "~/components/geist/icons-data";
import { accentVar, ACCENTS, type Accent } from "~/lib/catalog";

const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: IconName) => void;
}) {
  return (
    <div className="ipick" role="listbox" aria-label="Icono">
      {ICON_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          role="option"
          aria-selected={value === name}
          className={"ipick__btn" + (value === name ? " on" : "")}
          title={name}
          onClick={() => onChange(name)}
        >
          <Icon name={name} size={16} />
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: Accent) => void;
}) {
  return (
    <div className="swatches" role="listbox" aria-label="Color">
      {ACCENTS.map((c) => (
        <button
          key={c}
          type="button"
          role="option"
          aria-selected={value === c}
          className={"swatch" + (value === c ? " on" : "")}
          style={{ background: accentVar(c, 700) }}
          title={c}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
}

export function AdminSelect({ label, children, ...rest }: AdminSelectProps) {
  return (
    <div className="geist-field" data-full="true">
      {label != null && <span className="geist-field__label">{label}</span>}
      <select className="adm-select" {...rest}>
        {children}
      </select>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="geist-field__label">{children}</span>;
}
