import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { snowflakeSchema } from "@forgely/shared";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { TopBar } from "@/features/dashboard/top-bar";

/** Everything under /dashboard/<id> sits behind the access check, and shares the server header. */
export default async function GuildLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  if (!snowflakeSchema.safeParse(guildId).success) notFound();
  const server = await requireGuildAccess(guildId);

  return (
    <>
      <TopBar server={server} />
      {children}
    </>
  );
}
