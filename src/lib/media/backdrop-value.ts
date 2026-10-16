export const IMAGE_BACKDROPS = ["cut", "light", "dark"] as const;

export type Backdrop = (typeof IMAGE_BACKDROPS)[number];

/** Keep image metadata round-trips lossless while rejecting client-made values. */
export function imageBackdrop(value: unknown): Backdrop | null {
  return typeof value === "string" && (IMAGE_BACKDROPS as readonly string[]).includes(value)
    ? (value as Backdrop)
    : null;
}
