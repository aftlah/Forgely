"use client";

import { useState, type ReactNode } from "react";

import { ApplyButton, ConfirmDialog } from "./apply-panel";
import { ApplySummary } from "./apply-summary";
import type { ChatUser } from "./chat-avatar";
import { ChatComposer } from "./chat-composer";
import { ChatList, type ChatSummary } from "./chat-list";
import { ChatThread } from "./chat-thread";
import { PlanReview } from "./plan-review";
import { areAllCreatableSelected, listCreatableIds } from "./plan-selection";
import { useBuilder, type BuilderState } from "./use-builder";

const COLUMN = "min-w-0 rounded-[22px] border border-line bg-surface-raised p-5";
const COLUMN_TITLE = "font-mono text-[11px] tracking-[0.1em] text-muted uppercase";

/** What applying the latest plan did. It is a result, so it belongs in the conversation. */
function ResultNote({ builder }: { builder: BuilderState }): ReactNode {
  if (!builder.result) return null;
  return <ApplySummary result={builder.result} onStartOver={builder.newChat} />;
}

function applyProps(builder: BuilderState) {
  return {
    summary: builder.summary,
    deletionSummary: builder.deletionSummary,
    deleting: builder.deleting,
    changing: builder.changing,
    isConfirming: builder.isConfirming,
    isApplying: builder.status === "applying",
    onAskToConfirm: builder.askToConfirm,
    onCancel: builder.cancelConfirm,
    onApply: () => void builder.apply(),
  };
}

/** One button to tick or untick everything the plan would create. Deletions have their own, in their section. */
function SelectAllRow({
  builder,
  review,
}: {
  builder: BuilderState;
  review: NonNullable<BuilderState["review"]>;
}): ReactNode {
  if (listCreatableIds(review.diff).length === 0) return null;
  const isAllSelected = areAllCreatableSelected(review.diff, builder.excluded);
  return (
    <button
      type="button"
      onClick={() => builder.setAllCreatable(!isAllSelected)}
      className="cursor-pointer justify-self-start rounded-full border border-line-strong px-3 py-1 text-sm transition-colors hover:bg-surface-overlay"
    >
      {isAllSelected ? "Deselect all" : "Select all"}
    </button>
  );
}

/** Shown when every item in the plan is already on the server, so there is nothing to tick and nothing to create. */
function NothingNewNote({ hasOptions }: { hasOptions: boolean }): ReactNode {
  return (
    <div
      role="status"
      className="grid gap-1.5 rounded-md border border-line bg-surface-overlay p-3 text-sm"
    >
      <p className="font-semibold">Nothing new to create</p>
      <p className="text-muted">
        Everything in this plan already exists on your server (matched by name), so there is nothing
        to tick. Forgely only adds new things. It changes or deletes existing ones only when you
        tick them below.
      </p>
      <p className="text-muted">
        {hasOptions
          ? "The proposed changes below are the only things you can act on."
          : "Ask for something that isn't there yet, for example “add a channel called …”."}
      </p>
    </div>
  );
}

/** The plan card: its title and the Create button share the header, so the action sits with what it acts on. */
function PlanCard({ builder }: { builder: BuilderState }): ReactNode {
  const { review } = builder;
  const props = applyProps(builder);
  return (
    <section
      aria-label="Plan preview"
      className={`${COLUMN} order-2 lg:sticky lg:top-6 lg:order-3 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto`}
    >
      <header className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface-raised px-5 py-3">
        <h2 className={COLUMN_TITLE}>Plan</h2>
        {review && <ApplyButton {...props} />}
      </header>
      {review ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {builder.isConfirming && <ConfirmDialog {...props} />}
          {review.diff.newCount === 0 ? (
            <NothingNewNote
              hasOptions={review.diff.deletions.length + review.diff.accessChanges.length > 0}
            />
          ) : (
            <>
              <SelectAllRow builder={builder} review={review} />
              <p className="text-sm text-muted">
                Untick anything you don&apos;t want. {review.diff.newCount} new item
                {review.diff.newCount === 1 ? "" : "s"}; what already exists is left alone unless
                you tick it for deletion.
              </p>
            </>
          )}
          <PlanReview
            plan={review.plan}
            diff={review.diff}
            excluded={builder.excluded}
            onToggle={builder.toggle}
            deleteIds={builder.deleteIds}
            onToggleDelete={builder.toggleDelete}
            onSetAllDeletions={builder.setAllDeletable}
            accessIds={builder.accessIds}
            onToggleAccess={builder.toggleAccess}
            onSetAllAccess={builder.setAllAccess}
          />
        </div>
      ) : (
        <p className="text-sm text-muted">
          The plan appears here once it is ready. You choose what to create before anything happens.
        </p>
      )}
    </section>
  );
}

interface BuilderWorkspaceProps {
  guildId: string;
  chats: ChatSummary[];
  user: ChatUser;
}

/** The builder's page: saved chats on the left, the conversation in the middle, the plan on the right. */
export function BuilderWorkspace({ guildId, chats, user }: BuilderWorkspaceProps) {
  const builder = useBuilder(guildId);
  const [seed, setSeed] = useState({ text: "", version: 0 });
  const isBusy = builder.status !== "idle";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,400px)]">
      <section aria-label="Chats" className={`${COLUMN} order-3 lg:order-1`}>
        <h2 className={`${COLUMN_TITLE} mb-4`}>Chats</h2>
        <ChatList
          chats={chats}
          activeId={builder.chatId}
          isBusy={isBusy}
          onNew={builder.newChat}
          onOpen={(chatId) => void builder.openChat(chatId)}
          onDelete={(chatId) => void builder.removeChats(chatId)}
          onClearAll={() => void builder.removeChats()}
        />
      </section>

      <section
        aria-label="Conversation"
        className={`${COLUMN} order-1 grid grid-cols-[minmax(0,1fr)] gap-5 lg:order-2 lg:min-h-[calc(100vh-220px)] lg:grid-rows-[1fr_auto]`}
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
          <ChatThread
            messages={builder.messages}
            pendingText={builder.pendingText}
            isLoading={builder.status === "loading"}
            user={user}
            onPickExample={(text) => setSeed((current) => ({ text, version: current.version + 1 }))}
          />
          {builder.error && (
            <p
              role="alert"
              className="rounded-md border border-danger bg-surface-overlay p-3 text-sm"
            >
              {builder.error}
            </p>
          )}
          <ResultNote builder={builder} />
        </div>
        <ChatComposer
          isFollowUp={builder.messages.length > 0}
          isDisabled={isBusy}
          seed={seed}
          onSend={(text) => void builder.send(text)}
        />
      </section>

      <PlanCard builder={builder} />
    </div>
  );
}
