import type { HTMLAttributes } from "react";

export type BadgeColor =
  | "gray"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "pink"
  | "teal";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  color?: BadgeColor;
  variant?: "subtle" | "solid";
  size?: "small" | "medium";
  dot?: boolean;
}

export function Badge({
  children,
  color = "gray",
  variant = "subtle",
  size = "medium",
  dot = false,
  ...rest
}: BadgeProps) {
  return (
    <span
      className="geist-badge"
      data-color={color}
      data-style={variant}
      data-size={size}
      {...rest}
    >
      {dot && <span className="geist-badge__dot" />}
      {children}
    </span>
  );
}
