import { EYEBROW, SECTION, SECTION_HEADING } from "./layout-classes";

/** Only features that exist and are tested today. Keep this list honest as phases land. */
const FEATURES = [
  {
    name: "/ban /kick /timeout",
    text: "Role-hierarchy checks like Discord's own, an audit-log reason that names the moderator, and a DM sent first so it still arrives.",
  },
  {
    name: "/warn /warnings",
    text: "Warnings stored per server with case numbers, listed newest first.",
  },
  {
    name: "/purge",
    text: "Bulk delete up to 100 recent messages, optionally from one user, recorded as a case.",
  },
  {
    name: "Welcome and goodbye",
    text: "Templates with {user}, {username}, {server}, {memberCount}, an optional DM, and auto-roles. Messages can ping only the member who joined.",
  },
  {
    name: "Mod-log",
    text: "Every action posted to a channel you choose. A broken channel never blocks the action itself.",
  },
];

export function CommandsSection() {
  return (
    <section className={SECTION}>
      <p className={EYEBROW}>Built so far</p>
      <h2 className={`${SECTION_HEADING} mb-10 max-w-[16ch]`}>What works today.</h2>
      <dl className="border-t border-line">
        {FEATURES.map((feature) => (
          <div
            key={feature.name}
            className="grid gap-1.5 border-b border-line py-[22px] md:grid-cols-[minmax(200px,1fr)_2fr] md:gap-6"
          >
            <dt className="font-mono text-sm font-medium">{feature.name}</dt>
            <dd className="max-w-[62ch] text-muted">{feature.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-sm text-muted">
        Automod, leveling, tickets, and button roles are next. The AI builder is in the dashboard
        phase.
      </p>
    </section>
  );
}
