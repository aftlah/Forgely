import { listUserServers } from "@/features/auth/guild-access";
import { ServerList } from "@/features/dashboard/server-list";
import { SignInCard } from "@/features/dashboard/sign-in-card";

function describeActiveCount(count: number): string {
  return `${count} active server${count === 1 ? "" : "s"}`;
}

export default async function DashboardHomePage() {
  const result = await listUserServers();

  return (
    <div className="mx-auto max-w-[1120px]">
      <h1 className="display mb-1 text-[clamp(28px,3.4vw,40px)]">Your servers</h1>
      {result.status === "ok" ? (
        <>
          <p className="mb-8 text-sm text-muted">
            {describeActiveCount(result.servers.filter((server) => server.isBotPresent).length)}
          </p>
          <ServerList servers={result.servers} />
        </>
      ) : (
        <>
          <p className="mb-8 max-w-[56ch] text-muted">
            Servers where you can manage settings. Open one that already has Forgely, or add it to
            the others.
          </p>
          <SignInCard reason={result.status} />
        </>
      )}
    </div>
  );
}
