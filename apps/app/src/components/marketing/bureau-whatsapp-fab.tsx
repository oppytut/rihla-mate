export function BureauWhatsAppFab({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="fixed bottom-4 end-4 z-40 inline-flex min-h-12 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 md:bottom-6 md:end-6"
      rel="noopener noreferrer"
      target="_blank"
      data-testid="bureau-whatsapp-fab"
    >
      {label}
    </a>
  );
}
