"use client";

import { Plus, X } from "lucide-react";

import { MAX_BUTTONS_PER_PANEL, PANEL_BUTTON_STYLES, type RolePanelButton } from "@forgely/shared";
import { Button, Select } from "@forgely/ui";

import { RoleSelect } from "@/features/settings/fields/role-select";
import type { RoleOption } from "@/features/settings/guild-resources";

const SMALL_CONTROL =
  "rounded-sm border border-line-strong bg-surface-inset px-3 py-2 text-[15px] text-fg focus-visible:border-ember focus-visible:outline-none";

/** Discord's own button colors, so the swatch matches what members will see. */
const STYLE_COLORS: Record<RolePanelButton["style"], string> = {
  primary: "#5865f2",
  secondary: "#4e5058",
  success: "#248046",
  danger: "#da373c",
};

const STYLE_LABELS: Record<RolePanelButton["style"], string> = {
  primary: "Blue",
  secondary: "Grey",
  success: "Green",
  danger: "Red",
};

interface ButtonRowProps {
  /** Unique across panels and rows, so labels and inputs stay paired. */
  idBase: string;
  position: number;
  button: RolePanelButton;
  roles: RoleOption[];
  labelError: string | undefined;
  onChange: (patch: Partial<RolePanelButton>) => void;
  onRemove: () => void;
}

function ButtonRow({
  idBase,
  position,
  button,
  roles,
  labelError,
  onChange,
  onRemove,
}: ButtonRowProps) {
  const number = position + 1;
  return (
    <li className="flex flex-wrap items-start gap-3">
      <div>
        <label htmlFor={`${idBase}-label`} className="sr-only">
          Label for button {number}
        </label>
        <input
          id={`${idBase}-label`}
          type="text"
          value={button.label}
          maxLength={80}
          placeholder="Button label"
          aria-describedby={labelError ? `${idBase}-label-error` : undefined}
          onChange={(event) => onChange({ label: event.target.value })}
          className={`${SMALL_CONTROL} w-44`}
        />
        {labelError && (
          <p id={`${idBase}-label-error`} role="alert" className="mt-1 text-sm text-danger">
            {labelError}
          </p>
        )}
      </div>

      <label htmlFor={`${idBase}-role`} className="sr-only">
        Role for button {number}
      </label>
      <RoleSelect
        id={`${idBase}-role`}
        value={button.roleId}
        roles={roles}
        onChange={(roleId) => onChange({ roleId })}
        className="max-w-52"
      />

      <label htmlFor={`${idBase}-style`} className="sr-only">
        Color of button {number}
      </label>
      <Select
        id={`${idBase}-style`}
        value={button.style}
        onChange={(style) => style && onChange({ style: style as RolePanelButton["style"] })}
        options={PANEL_BUTTON_STYLES.map((style) => ({
          value: style,
          label: STYLE_LABELS[style],
          color: STYLE_COLORS[style],
        }))}
        className="w-36"
      />

      <button
        type="button"
        aria-label={`Remove button ${number}`}
        onClick={onRemove}
        className="grid size-9 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:border-danger hover:text-fg"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

interface PanelButtonsEditorProps {
  /** Used to make element IDs unique across panels. */
  panelIndex: number;
  buttons: RolePanelButton[];
  /** Null when Discord could not be reached, so roles are unknown. */
  roles: RoleOption[] | null;
  onChange: (buttons: RolePanelButton[]) => void;
  fieldError: (path: string) => string | undefined;
}

/** The buttons of one panel: a label, the role it gives, and a color. */
export function PanelButtonsEditor({
  panelIndex,
  buttons,
  roles,
  onChange,
  fieldError,
}: PanelButtonsEditorProps) {
  if (roles === null) {
    return (
      <p className="text-sm text-muted">
        Couldn&apos;t load this server&apos;s roles from Discord. Reload the page to try again.
      </p>
    );
  }

  const usedRoles = new Set(buttons.map((button) => button.roleId));
  const nextRole = roles.find((role) => role.isAssignable && !usedRoles.has(role.id));
  const update = (index: number, patch: Partial<RolePanelButton>): void =>
    onChange(
      buttons.map((button, position) => (position === index ? { ...button, ...patch } : button)),
    );
  const listError = fieldError(`panels.${panelIndex}.buttons`);

  return (
    <div>
      {buttons.length === 0 && <p className="mb-3 text-sm text-muted">No buttons yet.</p>}
      <ul className="m-0 grid list-none gap-3 p-0">
        {buttons.map((button, index) => (
          <ButtonRow
            key={button.roleId}
            idBase={`panel-${panelIndex}-button-${index}`}
            position={index}
            button={button}
            roles={roles}
            labelError={fieldError(`panels.${panelIndex}.buttons.${index}.label`)}
            onChange={(patch) => update(index, patch)}
            onRemove={() => onChange(buttons.filter((_, position) => position !== index))}
          />
        ))}
      </ul>

      {listError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {listError}
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={!nextRole || buttons.length >= MAX_BUTTONS_PER_PANEL}
          onClick={() =>
            nextRole &&
            onChange([
              ...buttons,
              { roleId: nextRole.id, label: nextRole.name, style: "secondary" },
            ])
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a button
        </Button>
        {!nextRole && (
          <p className="mt-2 text-sm text-muted">
            No more roles can be added. Move the Forgely role above the roles you want to hand out,
            in Server Settings.
          </p>
        )}
      </div>
    </div>
  );
}
