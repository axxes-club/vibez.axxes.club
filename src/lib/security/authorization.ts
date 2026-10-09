/** Operation roles are checked on the server, even when a client hides controls. */
export function assertWriteRole(context: {role: string}, operation: "write" | "manage" = "write") {
  const allowed = operation === "manage" ? ["owner", "admin", "manager"] : ["owner", "admin", "manager", "member"];
  if (!allowed.includes(context.role)) throw new Error("Forbidden: this role has read-only permission");
}
