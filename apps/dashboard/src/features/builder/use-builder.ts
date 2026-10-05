"use client";

import { useState } from "react";

import {
  selectPlan,
  type AccessChangeDiff,
  type PlanDeletion,
  type PlanDiff,
  type ServerPlan,
} from "@forgely/ai";

import {
  applyBuilderPlanAction,
  deleteBuilderChatsAction,
  generateBuilderPlanAction,
  loadBuilderChatAction,
} from "./actions";
import type { ApplyResult } from "./apply-plan";
import type { ChatMessage, ChatPlan } from "./builder-chats";
import { summarizeCreation, summarizeDeletions, type CreationSummary } from "./creation-summary";
import { listAccessIds, listCreatableIds, listDeletableIds } from "./plan-selection";

const GENERIC_ERROR = "Something went wrong. Nothing was changed. Try again.";
const EMPTY_SUMMARY: CreationSummary = { roles: 0, categories: 0, channels: 0, total: 0 };

export interface Review {
  runId: string;
  plan: ServerPlan;
  diff: PlanDiff;
}

export type BuilderStatus = "idle" | "planning" | "applying" | "loading";

export interface BuilderState {
  status: BuilderStatus;
  /** The open chat, or null for a new one that has no messages saved yet. */
  chatId: string | null;
  messages: ChatMessage[];
  /** The message being answered right now, shown before the AI replies. */
  pendingText: string | null;
  /** The chat's latest plan while it can still be applied. */
  review: Review | null;
  /** What applying the latest plan did, once it has been applied. */
  result: ApplyResult | null;
  /** Item IDs the user unticked. */
  excluded: ReadonlySet<string>;
  /** Discord IDs of the proposed deletions the user ticked. Empty by default: deleting is opt-in. */
  deleteIds: ReadonlySet<string>;
  /** What the current ticks would create. */
  summary: CreationSummary;
  /** What the ticked deletions would remove, and which items they are. */
  deletionSummary: CreationSummary;
  deleting: PlanDeletion[];
  /** Discord IDs of the channels whose proposed access change was ticked. Empty by default: it is opt-in. */
  accessIds: ReadonlySet<string>;
  /** The access changes the current ticks would make, so the confirmation can name them. */
  changing: AccessChangeDiff[];
  isConfirming: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  openChat: (chatId: string) => Promise<void>;
  newChat: () => void;
  removeChats: (chatId?: string) => Promise<void>;
  toggle: (itemId: string) => void;
  toggleDelete: (itemId: string) => void;
  toggleAccess: (channelId: string) => void;
  /** Ticks or unticks every proposed access change. Never touches creations or deletions. */
  setAllAccess: (isSelected: boolean) => void;
  /** Ticks (true) or unticks (false) everything the plan would create. */
  setAllCreatable: (isSelected: boolean) => void;
  /** Ticks or unticks every deletion that can be ticked. Never touches the creations. */
  setAllDeletable: (isSelected: boolean) => void;
  askToConfirm: () => void;
  cancelConfirm: () => void;
  apply: () => Promise<void>;
}

/** Every piece of state the flow keeps, with its setter, so the steps below can be plain functions. */
function useBuilderValues() {
  const [status, setStatus] = useState<BuilderStatus>("idle");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [current, setCurrent] = useState<ChatPlan | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<ReadonlySet<string>>(new Set());
  const [accessIds, setAccessIds] = useState<ReadonlySet<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    ...{ status, chatId, messages, pendingText, current, excluded, deleteIds, accessIds },
    ...{ isConfirming, error },
    ...{ setStatus, setChatId, setMessages, setPendingText, setCurrent },
    ...{ setExcluded, setDeleteIds, setAccessIds, setIsConfirming, setError },
  };
}

type Values = ReturnType<typeof useBuilderValues>;

function resetChat(values: Values): void {
  values.setChatId(null);
  values.setMessages([]);
  values.setPendingText(null);
  values.setCurrent(null);
  values.setExcluded(new Set());
  values.setDeleteIds(new Set());
  values.setAccessIds(new Set());
  values.setIsConfirming(false);
  values.setError(null);
}

async function runSend(guildId: string, text: string, values: Values): Promise<void> {
  values.setStatus("planning");
  values.setError(null);
  values.setPendingText(text.trim());
  try {
    const outcome = await generateBuilderPlanAction(guildId, text, values.chatId ?? undefined);
    if (!outcome.ok) return values.setError(outcome.message);
    values.setChatId(outcome.chatId);
    values.setMessages((existing) => [
      ...existing,
      { id: `${outcome.runId}-user`, role: "user", content: text.trim(), runId: null },
      { id: outcome.runId, role: "assistant", content: outcome.plan.summary, runId: outcome.runId },
    ]);
    values.setCurrent({
      status: "planned",
      runId: outcome.runId,
      plan: outcome.plan,
      diff: outcome.diff,
    });
    values.setExcluded(new Set());
    values.setDeleteIds(new Set());
    values.setAccessIds(new Set());
  } catch {
    values.setError(GENERIC_ERROR);
  } finally {
    values.setPendingText(null);
    values.setStatus("idle");
  }
}

async function runOpen(guildId: string, chatId: string, values: Values): Promise<void> {
  resetChat(values);
  values.setStatus("loading");
  try {
    const outcome = await loadBuilderChatAction(guildId, chatId);
    if (!outcome.ok) return values.setError(outcome.message);
    values.setChatId(outcome.chat.chatId);
    values.setMessages(outcome.chat.messages);
    values.setCurrent(outcome.chat.current);
  } catch {
    values.setError(GENERIC_ERROR);
  } finally {
    values.setStatus("idle");
  }
}

async function runRemove(guildId: string, chatId: string | undefined, values: Values) {
  try {
    const outcome = await deleteBuilderChatsAction(guildId, chatId);
    if (!outcome.ok) return values.setError(outcome.message ?? GENERIC_ERROR);
    if (!chatId || chatId === values.chatId) resetChat(values);
  } catch {
    values.setError(GENERIC_ERROR);
  }
}

async function runApply(guildId: string, values: Values): Promise<void> {
  const { current } = values;
  if (current?.status !== "planned") return;
  values.setStatus("applying");
  values.setError(null);
  try {
    const outcome = await applyBuilderPlanAction(
      guildId,
      current.runId,
      [...values.excluded],
      [...values.deleteIds],
      [...values.accessIds],
    );
    if (!outcome.ok) return values.setError(outcome.message);
    values.setCurrent({
      status: "finished",
      runId: current.runId,
      result: outcome.result,
      didFail: false,
    });
  } catch {
    values.setError(GENERIC_ERROR);
  } finally {
    values.setStatus("idle");
    values.setIsConfirming(false);
  }
}

/** What the current ticks would do, or nothing while there is no plan to review. */
function summarizeSelection(
  review: Review | null,
  excluded: ReadonlySet<string>,
  deleteIds: ReadonlySet<string>,
  accessIds: ReadonlySet<string>,
) {
  if (!review) {
    return { summary: EMPTY_SUMMARY, deletionSummary: EMPTY_SUMMARY, deleting: [], changing: [] };
  }
  const selection = selectPlan(review.plan, review.diff, excluded, deleteIds, accessIds);
  return {
    summary: summarizeCreation(selection),
    deletionSummary: summarizeDeletions(selection),
    deleting: selection.deletions,
    changing: selection.accessChanges,
  };
}

function flip(existing: ReadonlySet<string>, itemId: string): ReadonlySet<string> {
  const next = new Set(existing);
  if (!next.delete(itemId)) next.add(itemId);
  return next;
}

/** The ticking actions. "Select all" for creations means nothing unticked; for deletions it means ticking each. */
function selectionActions(values: Values, review: Review | null) {
  return {
    toggle: (itemId: string) => values.setExcluded((existing) => flip(existing, itemId)),
    toggleDelete: (itemId: string) => values.setDeleteIds((existing) => flip(existing, itemId)),
    setAllCreatable: (isSelected: boolean) =>
      values.setExcluded(new Set(isSelected || !review ? [] : listCreatableIds(review.diff))),
    toggleAccess: (channelId: string) =>
      values.setAccessIds((existing) => flip(existing, channelId)),
    setAllAccess: (isSelected: boolean) =>
      values.setAccessIds(new Set(isSelected && review ? listAccessIds(review.diff) : [])),
    setAllDeletable: (isSelected: boolean) =>
      values.setDeleteIds(new Set(isSelected && review ? listDeletableIds(review.diff) : [])),
  };
}

/** The AI Builder's flow: a saved chat per idea, a plan to review and tick, then confirm and apply. */
export function useBuilder(guildId: string): BuilderState {
  const values = useBuilderValues();
  const { current, excluded, deleteIds, accessIds } = values;
  const review = current?.status === "planned" ? current : null;
  const { summary, deletionSummary, deleting, changing } = summarizeSelection(
    review,
    excluded,
    deleteIds,
    accessIds,
  );

  return {
    status: values.status,
    chatId: values.chatId,
    messages: values.messages,
    pendingText: values.pendingText,
    review,
    result: current?.status === "finished" ? current.result : null,
    excluded,
    deleteIds,
    summary,
    deletionSummary,
    deleting,
    accessIds,
    changing,
    isConfirming: values.isConfirming,
    error: values.error,
    send: (text) => runSend(guildId, text, values),
    openChat: (chatId) => runOpen(guildId, chatId, values),
    newChat: () => resetChat(values),
    removeChats: (chatId) => runRemove(guildId, chatId, values),
    apply: () => runApply(guildId, values),
    ...selectionActions(values, review),
    askToConfirm: () => values.setIsConfirming(true),
    cancelConfirm: () => values.setIsConfirming(false),
  };
}
