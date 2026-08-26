export function BureauWhatsAppFab({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="fixed bottom-6 end-6 z-40 hidden min-h-12 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 lg:inline-flex"
      rel="noopener noreferrer"
      target="_blank"
      data-testid="bureau-whatsapp-fab"
    >
      {label}
    </a>
  );
}
