import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import type { ButtonSize, ButtonVariant } from "~/components/geist/button";

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "prefix"> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/** Enlace con la apariencia del Button Geist (para CTAs de navegación). */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  prefix = null,
  suffix = null,
  ...rest
}: ButtonLinkProps) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const cls = "geist-btn";
  const dataProps = {
    "data-variant": variant,
    "data-size": size,
    "data-full": fullWidth ? "true" : "false",
  };
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...dataProps} {...rest}>
        {prefix}
        {children}
        {suffix}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...dataProps} {...rest}>
      {prefix}
      {children}
      {suffix}
    </Link>
  );
}
