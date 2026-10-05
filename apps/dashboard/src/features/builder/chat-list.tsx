"use client";

import { MessageSquarePlus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@forgely/ui";

export interface ChatSummary {
  id: string;
  title: string;
}

interface ChatListProps {
  chats: ChatSummary[];
  activeId: string | null;
  isBusy: boolean;
  onNew: () => void;
  onOpen: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onClearAll: () => void;
}

const SMALL_BUTTON =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-sm text-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-50";

/** The person's saved chats, newest first, with a button to start another. */
export function ChatList({
  chats,
  activeId,
  isBusy,
  onNew,
  onOpen,
  onDelete,
  onClearAll,
}: ChatListProps) {
  const [isClearing, setIsClearing] = useState(false);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <button
        type="button"
        onClick={onNew}
        disabled={isBusy}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm transition-colors hover:bg-surface-overlay disabled:cursor-default disabled:opacity-50"
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
        New chat
      </button>

      {chats.length === 0 ? (
        <p className="text-sm text-muted">Your chats are saved here.</p>
      ) : (
        <ul
          aria-label="Saved chats"
          className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-0.5 p-0"
        >
          {chats.map((chat) => (
            <li key={chat.id} className="group relative">
              <button
                type="button"
                onClick={() => onOpen(chat.id)}
                disabled={isBusy}
                aria-current={chat.id === activeId ? "true" : undefined}
                className={cn(
                  "w-full cursor-pointer truncate rounded-lg py-2 pr-9 pl-3 text-left text-sm transition-colors disabled:cursor-default",
                  chat.id === activeId
                    ? "bg-surface-overlay text-fg"
                    : "text-muted hover:bg-surface-overlay hover:text-fg",
                )}
              >
                {chat.title}
              </button>
              <button
                type="button"
                onClick={() => onDelete(chat.id)}
                disabled={isBusy}
                aria-label={`Delete chat: ${chat.title}`}
                className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {chats.length > 0 &&
        (isClearing ? (
          <div role="alertdialog" aria-label="Delete all chats" className="grid gap-2 text-sm">
            <p className="text-muted">
              Delete all your chats here? Plans already applied to your server stay.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={cn(SMALL_BUTTON, "text-danger")}
                onClick={() => {
                  setIsClearing(false);
                  onClearAll();
                }}
              >
                Delete all
              </button>
              <button type="button" className={SMALL_BUTTON} onClick={() => setIsClearing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={cn(SMALL_BUTTON, "justify-self-start")}
            onClick={() => setIsClearing(true)}
            disabled={isBusy}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Clear all
          </button>
        ))}
    </div>
  );
}
