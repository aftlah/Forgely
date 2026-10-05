"use client";

import { Checkbox, cn } from "@forgely/ui";

import type { RoleOption } from "../guild-resources";

import { FieldError } from "./field-error";
import { FIELD_LABEL } from "./field-style";
import { UNAVAILABLE_TEXT } from "./role-reasons";

interface RoleChecklistProps {
  legend: string;
  hint: string;
  roles: RoleOption[] | null;
  selected: string[];
  max: number;
  /**
   * True (the default) when the bot hands these roles out, so it must be able to. False for roles that only
   * need to exist, such as who may see a ticket.
   */
  needsAssignable?: boolean;
  onChange: (roleIds: string[]) => void;
  error?: string;
}

/** Multi-select of roles. Roles the bot cannot assign are shown but disabled, with the reason. */
export function RoleChecklist({
  legend,
  hint,
  roles,
  selected,
  max,
  needsAssignable = true,
  onChange,
  error,
}: RoleChecklistProps) {
  if (roles === null) {
    return (
      <fieldset>
        <legend className={FIELD_LABEL}>{legend}</legend>
        <p className="text-sm text-muted">
          Couldn&apos;t load this server&apos;s roles from Discord. Reload the page to try again.
        </p>
      </fieldset>
    );
  }

  const toggle = (id: string): void =>
    onChange(
      selected.includes(id) ? selected.filter((roleId) => roleId !== id) : [...selected, id],
    );

  return (
    <fieldset aria-describedby={error ? "roles-error" : undefined}>
      <legend className={FIELD_LABEL}>{legend}</legend>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      {roles.length === 0 && <p className="text-sm text-muted">This server has no roles yet.</p>}
      <ul className="m-0 grid max-w-[520px] list-none gap-1 p-0">
        {roles.map((role) => {
          const isSelected = selected.includes(role.id);
          const isBlocked =
            !isSelected && ((needsAssignable && !role.isAssignable) || selected.length >= max);
          return (
            <li key={role.id}>
              <label
                className={cn(
                  "flex items-center gap-3 rounded-sm px-2 py-1.5",
                  isBlocked ? "opacity-50" : "cursor-pointer hover:bg-surface-overlay",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isBlocked}
                  onChange={() => toggle(role.id)}
                />
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full border border-line-strong"
                  style={role.color ? { background: role.color } : undefined}
                />
                <span className="flex-1 truncate text-[15px]">{role.name}</span>
                {needsAssignable && role.unavailableReason && (
                  <span className="font-mono text-xs text-muted">
                    {isSelected
                      ? "Forgely can't give this role"
                      : UNAVAILABLE_TEXT[role.unavailableReason]}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <FieldError id="roles-error" message={error} />
    </fieldset>
  );
}
