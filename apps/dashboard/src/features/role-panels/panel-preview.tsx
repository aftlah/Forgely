import type { RolePanel } from "@forgely/shared";

import type { RoleOption } from "@/features/settings/guild-resources";

/**
 * Discord's own button colors. This previews how Discord will draw the message, so these are Discord's
 * colors on purpose, not Forgely's palette.
 */
const BUTTON_CLASSES = {
  primary: "bg-[#5865f2]",
  secondary: "bg-[#4e5058]",
  success: "bg-[#248046]",
  danger: "bg-[#da373c]",
} as const;

/** A close imitation of the message the panel will become in Discord. */
export function PanelPreview({ panel, roles }: { panel: RolePanel; roles: RoleOption[] }) {
  const roleName = (id: string): string => roles.find((role) => role.id === id)?.name ?? "role";

  return (
    <div>
      <div className="max-w-[520px] rounded-md border border-line bg-surface-inset p-4">
        <div className="border-l-4 border-ember pl-3">
          <p className="font-semibold break-words">{panel.title || "Untitled panel"}</p>
          {panel.description && (
            <p className="mt-1 text-[15px] break-words whitespace-pre-wrap text-muted">
              {panel.description}
            </p>
          )}
        </div>
        {panel.buttons.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Add a button to see it here.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Buttons as Discord will show them">
            {panel.buttons.map((button) => (
              <span
                key={button.roleId}
                title={`Gives or takes: ${roleName(button.roleId)}`}
                className={`rounded-[3px] px-4 py-1.5 text-sm font-medium text-white ${BUTTON_CLASSES[button.style]}`}
              >
                {button.label || "Button"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
