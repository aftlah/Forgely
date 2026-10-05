import type { ReactNode } from "react";

import { cn } from "@forgely/ui";

import type { ChatMessage } from "./builder-chats";
import { AppAvatar, UserAvatar, type ChatUser } from "./chat-avatar";
import { PlanningProgress } from "./planning-progress";

/** Starting points, written the way a real owner would describe their server. */
const EXAMPLES = [
  "A competitive Valorant community with ranked roles, tryouts and a staff-only area",
  "A study group for university students with topic channels and quiet voice rooms",
  "A small art studio for commissions, WIP sharing and weekly challenges",
];

const BUBBLE =
  "min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-[14px] px-4 py-2.5 text-[15px]";

function Bubble({
  role,
  user,
  children,
}: {
  role: ChatMessage["role"];
  user: ChatUser;
  children: ReactNode;
}) {
  const isUser = role === "user";
  return (
    <li className={cn("flex items-start gap-3", isUser && "justify-end")}>
      {!isUser && <AppAvatar />}
      <div
        className={cn(
          BUBBLE,
          isUser ? "bg-bone text-ink" : "border border-line bg-surface-overlay text-fg",
        )}
      >
        {children}
      </div>
      {isUser && <UserAvatar user={user} />}
    </li>
  );
}

interface ChatThreadProps {
  messages: ChatMessage[];
  /** The message waiting for its answer, shown right away. */
  pendingText: string | null;
  isLoading: boolean;
  user: ChatUser;
  onPickExample: (example: string) => void;
}

/** The conversation so far. An empty chat offers example descriptions instead. */
export function ChatThread({
  messages,
  pendingText,
  isLoading,
  user,
  onPickExample,
}: ChatThreadProps) {
  if (isLoading) return <p className="text-sm text-muted">Opening chat…</p>;

  if (messages.length === 0 && !pendingText) {
    return (
      <div className="grid gap-4">
        <h2 className="display text-[22px]">Describe your server</h2>
        <p className="text-sm text-muted">
          Say what it is about and who it is for. You review the plan before anything is created,
          and you can ask for changes in the same chat.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Example descriptions">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPickExample(example)}
              className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-left text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ol
      aria-label="Conversation"
      className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-3 p-0"
    >
      {messages.map((message) => (
        <Bubble key={message.id} role={message.role} user={user}>
          {message.content}
        </Bubble>
      ))}
      {pendingText && (
        <>
          <Bubble role="user" user={user}>
            {pendingText}
          </Bubble>
          <li className="flex items-start gap-3">
            <AppAvatar />
            <PlanningProgress />
          </li>
        </>
      )}
    </ol>
  );
}
