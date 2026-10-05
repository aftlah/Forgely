import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { snowflakeSchema } from "@forgely/shared";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { GuildIcon } from "@/features/dashboard/guild-icon";

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
      <div className="mb-8 flex items-center gap-4 border-b border-line pb-5">
        <GuildIcon guild={server} />
        <h1 className="display text-[clamp(22px,2.6vw,28px)]">{server.name}</h1>
      </div>
      {children}
    </>
  );
}
