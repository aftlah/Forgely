import { createGuildConfigRepository, createOverviewRepository } from "@forgely/db";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { loadOverview } from "@/features/overview/load-overview";
import {
  BuilderBanner,
  FeaturesCard,
  OpenTicketsCard,
  RecentModCard,
  StatRow,
  TopMembersCard,
} from "@/features/overview/overview-sections";
import { getDatabase } from "@/lib/db";
import { getOverviewRest } from "@/lib/discord-overview-rest";

/** The layout above already checked that the user may manage this server. */
export default async function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);

  const db = getDatabase();
  const data = await loadOverview(
    {
      repository: createOverviewRepository(db),
      rest: getOverviewRest(),
      listModuleStates: (id) => createGuildConfigRepository(db).listModuleStates(id),
    },
    guildId,
  );
  const now = new Date();

  return (
    <div className="mx-auto grid max-w-[1120px] gap-4">
      <BuilderBanner guildId={guildId} />
      <StatRow data={data} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <TopMembersCard data={data} />
        <OpenTicketsCard data={data} now={now} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <FeaturesCard data={data} guildId={guildId} />
        <RecentModCard data={data} now={now} />
      </div>
    </div>
  );
}
