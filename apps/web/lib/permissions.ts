export type Permission = string;
export function hasPermission(granted: readonly string[] | undefined, required: Permission | Permission[]): boolean {
  if (!required) return true;
  const values = Array.isArray(required) ? required : [required];
  const set = new Set(granted ?? []);
  return set.has('*') || values.every((value) => set.has(value));
}
