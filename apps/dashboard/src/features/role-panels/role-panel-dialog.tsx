"use client";

import { Tag } from "lucide-react";
import { useState } from "react";

import type { RolePanel } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { PanelButtonsEditor } from "./panel-buttons-editor";
import {
  BehaviorPicker,
  ChannelSection,
  findPostBlocker,
  PreviewPane,
  Section,
  TemplatePicker,
} from "./panel-dialog-parts";

import { Modal } from "@/features/dashboard/modal";
import { CONTROL } from "@/features/settings/fields/field-style";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";

interface FooterProps {
  isNew: boolean;
  isSaving: boolean;
  willPost: boolean;
  canSave: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}

function DialogFooter({ isNew, isSaving, willPost, canSave, ...actions }: FooterProps) {
  return (
    <>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={actions.onCancel} disabled={isSaving}>
          Cancel
        </Button>
        {!isNew && (
          <Button variant="ghost" size="sm" onClick={actions.onDelete} disabled={isSaving}>
            Delete panel
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">{willPost ? "Saves, then posts" : "Saves only"}</span>
        <Button variant="bone" size="sm" onClick={actions.onSave} disabled={isSaving || !canSave}>
          {isSaving ? "Saving…" : "Save panel"}
        </Button>
      </div>
    </>
  );
}

interface RolePanelDialogProps {
  panel: RolePanel;
  /** Where the panel sits (or will sit) in the saved list, for the server's per-field messages. */
  index: number;
  isNew: boolean;
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
  fieldError: (path: string) => string | undefined;
  /** Saves, then posts when asked. Resolves to a message when something failed, or null when all went well. */
  onSave: (panel: RolePanel, shouldPost: boolean) => Promise<string | null>;
  onDelete: () => void;
  onClose: () => void;
}

/** Create or edit one panel in a dialog, with a live preview. Nothing changes until Save. */
export function RolePanelDialog(props: RolePanelDialogProps) {
  const { index, isNew, channels, roles, fieldError, onSave, onDelete, onClose } = props;
  const [panel, setPanel] = useState(props.panel);
  const [wantsPost, setWantsPost] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<RolePanel>): void =>
    setPanel((current) => ({ ...current, ...patch }));

  const postBlocker = findPostBlocker(panel);
  const willPost = wantsPost && postBlocker === null;
  const base = `panel-${index}`;
  const titleError = fieldError(`panels.${index}.title`);

  async function save(): Promise<void> {
    setIsSaving(true);
    setError(null);
    const message = await onSave(panel, willPost);
    // On success the parent closes the dialog, so only a failure needs the screen back.
    if (message) setError(message);
    setIsSaving(false);
  }

  return (
    <Modal
      icon={Tag}
      title={isNew ? "New role panel" : "Edit role panel"}
      subtitle="A message with buttons that give or take a role"
      onClose={onClose}
      footer={
        <DialogFooter
          isNew={isNew}
          isSaving={isSaving}
          willPost={willPost}
          canSave={panel.title.trim() !== ""}
          onCancel={onClose}
          onDelete={onDelete}
          onSave={() => void save()}
        />
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {isNew && (
            <Section label="Start with a template">
              <TemplatePicker
                onPick={(template) =>
                  set({
                    title: template.title,
                    description: template.description,
                    mode: template.mode,
                  })
                }
              />
            </Section>
          )}
          <Section label="Behavior">
            <BehaviorPicker value={panel.mode} onChange={(mode) => set({ mode })} />
          </Section>
          <Section label="Title" htmlFor={`${base}-title`}>
            <input
              id={`${base}-title`}
              type="text"
              value={panel.title}
              maxLength={100}
              onChange={(event) => set({ title: event.target.value })}
              className={CONTROL}
            />
            {titleError && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {titleError}
              </p>
            )}
          </Section>
          <Section label="Description" htmlFor={`${base}-description`}>
            <textarea
              id={`${base}-description`}
              rows={3}
              value={panel.description}
              maxLength={2000}
              placeholder="Optional"
              onChange={(event) => set({ description: event.target.value })}
              className={CONTROL}
            />
          </Section>
          <ChannelSection
            id={`${base}-channel`}
            panel={panel}
            channels={channels}
            willPost={willPost}
            postBlocker={postBlocker}
            error={fieldError(`panels.${index}.channelId`)}
            onChannel={(channelId) => set({ channelId })}
            onWantsPost={setWantsPost}
          />
          <Section label={`Roles (${panel.buttons.length})`}>
            <PanelButtonsEditor
              panelIndex={index}
              buttons={panel.buttons}
              roles={roles}
              onChange={(buttons) => set({ buttons })}
              fieldError={fieldError}
            />
          </Section>
        </div>
        <PreviewPane
          panel={panel}
          roles={roles}
          destination={channels?.find((channel) => channel.id === panel.channelId)?.name}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="m-5 rounded-md border border-danger bg-surface-overlay p-3 text-sm"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}
