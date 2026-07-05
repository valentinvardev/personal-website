"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "error";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "prefix"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  fullWidth = false,
  prefix = null,
  suffix = null,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className="geist-btn"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : "false"}
      data-full={fullWidth ? "true" : "false"}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="geist-btn__spin" aria-hidden="true" /> : prefix}
      {children}
      {!loading && suffix}
    </button>
  );
}
