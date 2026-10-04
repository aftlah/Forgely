import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { snowflakeSchema } from "@forgely/shared";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { GuildIcon } from "@/features/dashboard/guild-icon";
import { GuildTabs } from "@/features/dashboard/guild-tabs";

/** Everything under /dashboard/<id> sits behind the access check, and shares the server header and tabs. */
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
      <div className="mb-6 flex items-center gap-4">
        <GuildIcon guild={server} />
        <h1 className="display text-[clamp(26px,3.2vw,36px)]">{server.name}</h1>
      </div>
      <GuildTabs guildId={guildId} />
      {children}
    </>
  );
}
