import type { HTMLAttributes, ReactNode } from "react";

const SIZES = { small: 24, medium: 32, large: 40 } as const;

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: keyof typeof SIZES | number;
}

export function Avatar({ src, alt = "", name, size = "medium", ...rest }: AvatarProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : null;
  return (
    <span
      className="geist-avatar"
      style={{ width: px, height: px, fontSize: Math.round(px * 0.4) }}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || name || ""} />
      ) : (
        initials
      )}
    </span>
  );
}

export function AvatarGroup({ children }: { children: ReactNode }) {
  return <span className="geist-avatar-group">{children}</span>;
}
