# role-panels module

Messages with buttons that give or take roles ("button roles").

- Panels are designed in the dashboard (title, description, buttons, roles) and posted from there. They are
  stored in the module's config (`rolePanelsModuleConfig` in `@forgely/shared`), so saving, validation, the
  audit log, and live reload all work like any other module.
- This module only handles clicks. Each button's custom ID is `rp:<panelId>:<roleId>`
  (`buildRolePanelButtonId` / `parseRolePanelButtonParts` in `@forgely/shared`, shared with the dashboard).
- Modes: **toggle** (each button adds or removes its own role) and **unique** (choosing one removes the
  member's other roles from the same panel; clicking the current one drops it).
- **The button's IDs are not trusted.** The service looks the panel up in the saved config and refuses any
  role that is not one of that panel's buttons, so an old message or a forged ID can never hand out a role.
- If Discord refuses (the role is above Forgely's), the member gets a private message saying how to fix it,
  and the details are logged. Nothing is thrown.
- Replies are private to the member who clicked, and mention roles without pinging anyone.
- Needs no privileged intent. Interactions are delivered regardless of intents.
