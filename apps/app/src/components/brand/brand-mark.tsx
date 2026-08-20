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
  const label = showWordmark ? wordmark : abbr;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        role="img"
        aria-label={label}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20",
          sizeMap[size],
        )}
      >
        <svg viewBox="0 0 32 32" className="h-[72%] w-[72%]" fill="none" aria-hidden>
          <path
            d="M8 22.5V12.2L16 7.5l8 4.7v10.3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M12.2 22.5V14.8h7.6v7.7"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <rect
            x="14.35"
            y="17.4"
            width="3.3"
            height="5.1"
            rx="0.4"
            fill="currentColor"
            className="text-accent"
          />
          <path
            d="M23.2 9.2a4.4 4.4 0 1 1-6.2-6.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="text-accent"
          />
        </svg>
        <span className="sr-only">{abbr}</span>
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
