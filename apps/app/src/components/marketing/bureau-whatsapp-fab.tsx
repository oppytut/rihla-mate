export function BureauWhatsAppFab({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="fixed right-6 bottom-6 z-40 inline-flex min-h-12 max-w-[calc(100vw-3rem)] items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 sm:px-5"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      rel="noopener noreferrer"
      target="_blank"
      data-testid="bureau-whatsapp-fab"
    >
      <span aria-hidden className="text-base leading-none">
        WA
      </span>
      <span className="truncate">{label}</span>
    </a>
  );
}
