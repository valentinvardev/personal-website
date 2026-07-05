"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  size?: "small" | "medium" | "large";
  prefix?: ReactNode;
  suffix?: ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  hint,
  error = false,
  size = "medium",
  prefix = null,
  suffix = null,
  fullWidth = false,
  disabled = false,
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? (label != null ? autoId : undefined);
  return (
    <div className="geist-field" data-full={fullWidth ? "true" : "false"}>
      {label != null && (
        <label className="geist-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className="geist-input"
        data-size={size}
        data-error={error ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
      >
        {prefix != null && <span className="geist-input__affix">{prefix}</span>}
        <input id={inputId} className="geist-input__el" disabled={disabled} {...rest} />
        {suffix != null && <span className="geist-input__affix">{suffix}</span>}
      </div>
      {hint != null && (
        <span className="geist-field__hint" data-error={error ? "true" : "false"}>
          {hint}
        </span>
      )}
    </div>
  );
}
