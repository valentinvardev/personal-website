"use client";

import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: boolean;
}

export function Textarea({ label, error = false, id, ...rest }: TextareaProps) {
  const autoId = useId();
  const taId = id ?? (label != null ? autoId : undefined);
  return (
    <div className="geist-ta-field">
      {label != null && (
        <label className="geist-ta-field__label" htmlFor={taId}>
          {label}
        </label>
      )}
      <textarea
        id={taId}
        className="geist-ta"
        data-error={error ? "true" : "false"}
        {...rest}
      />
    </div>
  );
}
