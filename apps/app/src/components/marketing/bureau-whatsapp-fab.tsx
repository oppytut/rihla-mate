export function BureauWhatsAppFab({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="fixed bottom-4 end-4 z-40 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 md:bottom-6 md:end-6"
      rel="noopener noreferrer"
      target="_blank"
      data-testid="bureau-whatsapp-fab"
    >
      {label}
    </a>
  );
}
