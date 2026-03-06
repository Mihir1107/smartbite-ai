export function formatSmartTimestamp(timestamp?: string | null): string {
  if (!timestamp) return "Unknown";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < 24 * hourMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
