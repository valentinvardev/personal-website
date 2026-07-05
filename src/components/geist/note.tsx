import type { HTMLAttributes, ReactNode } from "react";

export type NoteType = "default" | "info" | "success" | "error" | "warning";

const ICONS: Record<NoteType, string> = {
  default: "M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z",
  info: "M12 16v-4m0-4h.01M12 3a9 9 0 100 18 9 9 0 000-18z",
  success: "M20 6 9 17l-5-5",
  error: "M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z",
  warning:
    "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0z",
};

const DEFAULT_LABEL: Record<NoteType, string> = {
  default: "Note",
  info: "Note",
  success: "Success",
  error: "Error",
  warning: "Warning",
};

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  type?: NoteType;
  label?: ReactNode;
}

export function Note({ children, type = "default", label, ...rest }: NoteProps) {
  const resolvedLabel = label === undefined ? DEFAULT_LABEL[type] : label;
  return (
    <div className="geist-note" data-type={type} {...rest}>
      <svg
        className="geist-note__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICONS[type]} />
      </svg>
      <div className="geist-note__body">
        {resolvedLabel != null && resolvedLabel !== false && (
          <span className="geist-note__label">{resolvedLabel}:</span>
        )}
        {children}
      </div>
    </div>
  );
}
