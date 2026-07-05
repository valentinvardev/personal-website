"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  label,
  ...rest
}: CheckboxProps) {
  return (
    <label className="geist-cb" data-disabled={disabled ? "true" : "false"}>
      <input
        type="checkbox"
        className="geist-cb__input"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="geist-cb__box">
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 6.5 4.8 9 10 3" />
        </svg>
      </span>
      {label != null && <span className="geist-cb__label">{label}</span>}
    </label>
  );
}
