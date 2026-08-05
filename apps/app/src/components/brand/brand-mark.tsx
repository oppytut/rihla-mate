import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
  xl: "h-12 w-12 text-lg",
} as const;

type BrandMarkProps = {
  size?: keyof typeof sizeMap;
  className?: string;
  showWordmark?: boolean;
  wordmark?: string;
  abbr?: string;
  wordmarkClassName?: string;
};

export function BrandMark({
  size = "md",
  className,
  showWordmark = false,
  wordmark = "Rihla Mate",
  abbr = "RM",
  wordmarkClassName,
}: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden={showWordmark ? true : undefined}
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm ring-1 ring-primary/20",
          sizeMap[size],
        )}
      >
        <span className="relative z-10 leading-none tracking-tight">{abbr}</span>
        <span
          className="absolute inset-x-0 bottom-0 h-[28%] rounded-b-lg bg-accent/90"
          aria-hidden
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" && "text-sm",
            size === "md" && "text-lg",
            size === "lg" && "text-xl",
            size === "xl" && "text-2xl",
            wordmarkClassName,
          )}
        >
          {wordmark}
        </span>
      ) : null}
    </span>
  );
}
