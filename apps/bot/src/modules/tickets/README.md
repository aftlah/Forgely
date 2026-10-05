# tickets module

A panel message with an **Open a ticket** button, one private channel per ticket, and a **Close ticket**
button inside it.

- Config: `ticketsModuleConfig` in `@forgely/shared` (category for new channels, support roles, log channel,
  max open tickets per person, and the panel text). Disabled until switched on per server.
- Button custom IDs are `tk:open` and `tk:close`. The router gates them by module, so turning the module off
  makes old panels stop working. The close button needs no ID: the channel identifies the ticket.
- Opening: a cheap limit check, create the channel (only the person, the support roles, and the bot can see
  it), then `createIfUnderLimit`. The count and the insert run under one advisory lock per server, so two
  simultaneous clicks cannot both get through and numbers never repeat. If the race is lost, the extra
  channel is deleted again.
- Closing is **archiving, not deleting**: the ticket is marked closed (one atomic `UPDATE ... WHERE status =
'open'`), the person's access is removed, the channel is renamed `closed-...`, and the team deletes it when
  done. This is deliberate: there are no transcripts yet, so deleting would lose the conversation.
- Who can close: the person who opened it, anyone with a support role, anyone with Manage Channels.
- If a ticket channel is deleted in Discord, `channelDelete` closes the ticket in the database, so it no
  longer counts against the person's limit. This runs even when the module is off.
- Failures after the channel exists (welcome message, log post, archiving) are logged and never undo the ticket.
- Needs the bot to have Manage Channels. It needs no new gateway intent.
- **Transcripts are not built.** They need the privileged Message Content intent, a retention policy, and a
  privacy-page disclosure (see CLAUDE.md, "Risks to remember").
