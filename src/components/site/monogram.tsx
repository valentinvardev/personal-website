export function Monogram({ size = 30 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ds-gray-1000)",
        color: "var(--ds-background-100)",
        font: "var(--ds-heading-16)",
        letterSpacing: "-0.04em",
      }}
    >
      VV
    </span>
  );
}
