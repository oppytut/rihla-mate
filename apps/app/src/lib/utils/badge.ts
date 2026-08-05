export function getStatusBadgeClass(pkgStatus: string): string {
  switch (pkgStatus) {
    case "published":
      return "bg-success/10 text-success dark:text-success";
    case "draft":
      return "bg-accent/20 text-accent-foreground dark:text-accent";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
