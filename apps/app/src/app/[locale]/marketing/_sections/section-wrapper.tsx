import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  borderTop?: boolean;
  id?: string;
}

export function SectionWrapper({
  children,
  className,
  borderTop = false,
  id,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn("py-20 lg:py-28", borderTop && "border-t border-border/40", className)}
    >
      {children}
    </section>
  );
}
