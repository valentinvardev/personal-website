import type { HTMLAttributes } from "react";

const SIZES = { small: 16, medium: 20, large: 24 } as const;

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof SIZES | number;
}

export function Spinner({ size = "medium", ...rest }: SpinnerProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  const bw = Math.max(2, Math.round(px / 10));
  return (
    <span
      className="geist-spinner"
      style={{ width: px, height: px, borderWidth: bw }}
      role="status"
      aria-label="Loading"
      {...rest}
    />
  );
}
