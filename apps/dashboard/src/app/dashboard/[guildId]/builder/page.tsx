import type { Metadata } from "next";

import { createBuilderChatRepository } from "@forgely/db";

import { auth } from "@/auth";
import { requireGuildAccess } from "@/features/auth/guild-access";
import { BuilderWorkspace } from "@/features/builder/builder-workspace";
import { getDatabase } from "@/lib/db";
import { isBuilderConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "AI Builder" };

const MAX_LISTED_CHATS = 50;

export default async function BuilderPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);

  if (!isBuilderConfigured()) {
    return (
      <p className="max-w-[720px] rounded-md border border-line bg-surface-inset p-4 text-sm text-muted">
        The AI Builder isn&apos;t set up on this installation yet. It needs a Gemini API key in the
        dashboard&apos;s environment.
      </p>
    );
  }

  // Chats belong to the person who started them; requireGuildAccess already proved they are signed in.
  const session = await auth();
  const chats = session?.user?.id
    ? await createBuilderChatRepository(getDatabase()).listChats(
        guildId,
        session.user.id,
        MAX_LISTED_CHATS,
      )
    : [];

  return (
    <BuilderWorkspace
      guildId={guildId}
      chats={chats.map((chat) => ({ id: chat.id, title: chat.title }))}
      user={{ name: session?.user?.name ?? "You", image: session?.user?.image ?? null }}
    />
  );
}
