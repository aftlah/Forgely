"use client";

import { cn } from "@forgely/ui";

import type { RoleOption } from "../guild-resources";

import { UNAVAILABLE_TEXT } from "./role-reasons";

interface RoleSelectProps {
  id: string;
  value: string;
  roles: RoleOption[];
  onChange: (roleId: string) => void;
  className?: string;
}

/**
 * Picks one role. A role Forgely can't hand out stays visible with the reason, but can't be newly
 * chosen. The role already selected stays selectable even if it has since become unavailable.
 */
export function RoleSelect({ id, value, roles, onChange, className }: RoleSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "rounded-sm border border-line-strong bg-surface-inset px-3 py-2 text-[15px] text-fg focus-visible:border-ember focus-visible:outline-none",
        className,
      )}
    >
      {!roles.some((role) => role.id === value) && <option value={value}>(role not found)</option>}
      {roles.map((role) => (
        <option key={role.id} value={role.id} disabled={!role.isAssignable && role.id !== value}>
          {role.name}
          {role.unavailableReason ? ` (${UNAVAILABLE_TEXT[role.unavailableReason]})` : ""}
        </option>
      ))}
    </select>
  );
}
