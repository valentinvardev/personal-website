import type { CSSProperties } from "react";

import { ICONS, type IconName } from "./icons-data";

export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

/** Icono de línea (subset de Lucide) — hereda el color vía `currentColor`. */
export function Icon({ name, size = 18, color, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        flex: "none",
        color,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
