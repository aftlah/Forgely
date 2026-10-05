"use client";

import { Select } from "@forgely/ui";

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
 * Picks one role, shown with its color. A role Forgely can't hand out stays visible with the reason, but
 * can't be newly chosen. The role already selected stays selectable even if it has since become unavailable.
 */
export function RoleSelect({ id, value, roles, onChange, className }: RoleSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(roleId) => roleId && onChange(roleId)}
      unknownLabel="(role not found)"
      className={className}
      options={roles.map((role) => ({
        value: role.id,
        label: role.name,
        color: role.color,
        note: role.unavailableReason ? UNAVAILABLE_TEXT[role.unavailableReason] : undefined,
        disabled: !role.isAssignable && role.id !== value,
      }))}
    />
  );
}
