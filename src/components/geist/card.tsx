import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}

export function Card({
  title,
  description,
  children,
  footer,
  compact = false,
  ...rest
}: CardProps) {
  return (
    <div className="geist-card" data-compact={compact ? "true" : "false"} {...rest}>
      {(title ?? description) != null && (
        <div className="geist-card__header">
          {title != null && <h3 className="geist-card__title">{title}</h3>}
          {description != null && <p className="geist-card__desc">{description}</p>}
        </div>
      )}
      {children != null && <div className="geist-card__body">{children}</div>}
      {footer != null && <div className="geist-card__footer">{footer}</div>}
    </div>
  );
}
