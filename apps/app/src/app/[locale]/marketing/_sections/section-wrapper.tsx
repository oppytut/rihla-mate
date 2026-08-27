import { cn } from "@/lib/utils";

export const marketingShellClass = "mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10";

export const bureauShellClass = "mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-10 xl:px-16";

export const bureauInnerClass = "mx-auto w-full max-w-6xl";

export const bureauMediaClass = "mx-auto w-full max-w-7xl";

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
      className={cn("py-16 lg:py-20", borderTop && "border-t border-border/40", className)}
    >
      {children}
    </section>
  );
}
