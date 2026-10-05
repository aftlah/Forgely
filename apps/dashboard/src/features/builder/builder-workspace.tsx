"use client";

import { useState, type ReactNode } from "react";

import { ApplyPanel } from "./apply-panel";
import { ApplySummary } from "./apply-summary";
import type { ChatUser } from "./chat-avatar";
import { ChatComposer } from "./chat-composer";
import { ChatList, type ChatSummary } from "./chat-list";
import { ChatThread } from "./chat-thread";
import { PlanReview } from "./plan-review";
import { useBuilder, type BuilderState } from "./use-builder";

const COLUMN = "min-w-0 rounded-[22px] border border-line bg-surface-raised p-5";
const COLUMN_TITLE = "mb-4 font-mono text-[11px] tracking-[0.1em] text-muted uppercase";

/** Under the conversation: what to do with the latest plan, or what applying it did. */
function PlanActions({ builder }: { builder: BuilderState }): ReactNode {
  if (builder.result) {
    return <ApplySummary result={builder.result} onStartOver={builder.newChat} />;
  }
  if (!builder.review) return null;

  const count = builder.review.diff.newCount;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line pt-5">
      <p className="text-sm text-muted">
        Untick anything you don&apos;t want in the plan on the right. {count} new item
        {count === 1 ? "" : "s"}; what already exists is left alone unless you tick it for deletion.
      </p>
      <ApplyPanel
        summary={builder.summary}
        deletionSummary={builder.deletionSummary}
        deleting={builder.deleting}
        isConfirming={builder.isConfirming}
        isApplying={builder.status === "applying"}
        onAskToConfirm={builder.askToConfirm}
        onCancel={builder.cancelConfirm}
        onApply={() => void builder.apply()}
        onStartOver={builder.newChat}
      />
    </div>
  );
}

function PlanColumn({ builder }: { builder: BuilderState }): ReactNode {
  if (!builder.review) {
    return (
      <p className="text-sm text-muted">
        The plan appears here once it is ready. You choose what to create before anything happens.
      </p>
    );
  }
  return (
    <PlanReview
      plan={builder.review.plan}
      diff={builder.review.diff}
      excluded={builder.excluded}
      onToggle={builder.toggle}
      deleteIds={builder.deleteIds}
      onToggleDelete={builder.toggleDelete}
    />
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
        <h2 className={COLUMN_TITLE}>Chats</h2>
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
          <PlanActions builder={builder} />
        </div>
        <ChatComposer
          isFollowUp={builder.messages.length > 0}
          isDisabled={isBusy}
          seed={seed}
          onSend={(text) => void builder.send(text)}
        />
      </section>

      <section
        aria-label="Plan preview"
        className={`${COLUMN} order-2 lg:sticky lg:top-6 lg:order-3 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto`}
      >
        <h2 className={COLUMN_TITLE}>Plan</h2>
        <PlanColumn builder={builder} />
      </section>
    </div>
  );
}
