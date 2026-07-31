import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${className} `}
    >
      {children}
    </section>
  );
}
