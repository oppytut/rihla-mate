"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rihla-mate-dismissed-version";

interface NotificationBannerProps {
  currentVersion: string;
}

export function NotificationBanner({ currentVersion }: NotificationBannerProps) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const dismissedVersion = localStorage.getItem(STORAGE_KEY);

        const response = await fetch(
          "https://api.github.com/repos/rihlamate/rihla-mate/releases/latest",
        );
        if (!response.ok) return;

        const release = (await response.json()) as { tag_name: string };
        const latest = release.tag_name.replace(/^v/, "");

        if (cancelled) return;

        if (latest && latest !== currentVersion && latest !== dismissedVersion) {
          setLatestVersion(latest);
          setVisible(true);
        }
      } catch {
        // Network error or rate limited — silently ignore
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void checkVersion();

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const handleDismiss = () => {
    if (latestVersion) {
      localStorage.setItem(STORAGE_KEY, latestVersion);
    }
    setVisible(false);
  };

  if (loading || !visible || !latestVersion) return null;

  return (
    <div
      role="alert"
      data-testid="notification-banner"
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3",
        "bg-primary/10 border-b border-primary/20",
        "text-sm text-foreground",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center size-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs font-bold">
          !
        </span>
        <p className="truncate">
          {t("notifications.updateAvailable", { version: `v${latestVersion}` })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="link" size="xs" asChild data-testid="notification-banner-link">
          <a
            href={`https://github.com/rihlamate/rihla-mate/releases/tag/v${latestVersion}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("notifications.updateLink")}
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDismiss}
          aria-label={t("notifications.dismiss")}
          data-testid="notification-banner-dismiss"
        >
          <X className="size-3" />
        </Button>
      </div>
    </div>
  );
}
