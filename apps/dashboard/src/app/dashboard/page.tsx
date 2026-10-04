import { listUserServers } from "@/features/auth/guild-access";
import { ServerList } from "@/features/dashboard/server-list";
import { SignInCard } from "@/features/dashboard/sign-in-card";

export default async function DashboardHomePage() {
  const result = await listUserServers();

  return (
    <>
      <h1 className="display mb-2 text-[clamp(28px,3.4vw,40px)]">Your servers</h1>
      <p className="mb-8 max-w-[56ch] text-muted">
        Servers where you can manage settings. Open one that already has Forgely, or add it to the
        others.
      </p>
      {result.status === "ok" ? (
        <ServerList servers={result.servers} />
      ) : (
        <SignInCard reason={result.status} />
      )}
    </>
  );
}
