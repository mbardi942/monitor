export function getStatusClass(status: string): string {
  switch (status) {
    case "UP":
      return "badge-up";
    case "DOWN":
      return "badge-down";
    case "DEGRADED":
      return "badge-degraded";
    default:
      return "badge-paused";
  }
}

export function getStatusDotClass(status: string): string {
  switch (status) {
    case "UP":
      return "pulse-dot-up";
    case "DOWN":
      return "pulse-dot-down";
    case "DEGRADED":
      return "pulse-dot-degraded";
    default:
      return "pulse-dot-paused";
  }
}
