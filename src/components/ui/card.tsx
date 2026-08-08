import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  // When set, renders as a real <button> instead of a <section> — the one
  // supported way to make a Card clickable (e.g. the Rewards Earned tile
  // switching tabs) without every call site re-implementing Card's own
  // surface/border/shadow/hover styling on a bare button.
  onClick?: () => void;
};

export default function Card({ children, className = "", onClick }: CardProps) {
  const surfaceClassName = `rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${className} `;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${surfaceClassName}`}>
        {children}
      </button>
    );
  }

  return <section className={surfaceClassName}>{children}</section>;
}
