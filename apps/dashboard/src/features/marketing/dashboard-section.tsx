import { DashboardPreview } from "./dashboard-preview";
import { EYEBROW, SECTION } from "./layout-classes";

export function DashboardSection() {
  return (
    <section
      id="dashboard"
      className={`${SECTION} grid items-center gap-[clamp(32px,5vw,64px)] lg:grid-cols-[4fr_8fr]`}
    >
      <div>
        <p className={EYEBROW}>Dashboard</p>
        <h2 className="display text-[clamp(30px,3.4vw,46px)]">Every module has its own page.</h2>
        <p className="mt-6 max-w-[40ch] text-muted">
          Switch features on per server, change the settings, and see at a glance whether you have
          unsaved changes. Edits reach the running bot without a restart.
        </p>
      </div>
      <DashboardPreview />
    </section>
  );
}
