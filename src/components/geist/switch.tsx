"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: "small" | "medium";
  label?: ReactNode;
}

export function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = "medium",
  label,
  ...rest
}: SwitchProps) {
  return (
    <label className="geist-switch" data-disabled={disabled ? "true" : "false"}>
      <span className="geist-switch__track" data-size={size}>
        <input
          type="checkbox"
          className="geist-switch__input"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          {...rest}
        />
        <span className="geist-switch__knob" />
      </span>
      {label != null && <span className="geist-switch__label">{label}</span>}
    </label>
  );
}
