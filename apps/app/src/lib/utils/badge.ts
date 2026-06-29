export function getStatusBadgeClass(pkgStatus: string): string {
  switch (pkgStatus) {
    case "published":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "draft":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
