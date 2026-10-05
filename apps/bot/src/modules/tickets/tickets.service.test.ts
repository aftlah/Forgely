import { describe, expect, it, vi } from "vitest";

import type { TicketRow } from "@forgely/db";
import { ticketsModuleConfig, type TicketsConfig } from "@forgely/shared";

import { createSilentLogger } from "../../testing/silent-logger";

import type { TicketsRepository } from "./tickets.repository";
import {
  buildTicketChannelName,
  canCloseTicket,
  createTicketsService,
  type TicketsPort,
} from "./tickets.service";

const GUILD = "111111111111111111";
const OPENER = "222222222222222222";
const CATEGORY = "333333333333333333";
const SUPPORT = "444444444444444444";
const LOG = "555555555555555555";
const NEW_CHANNEL = "666666666666666666";
const OTHER = "777777777777777777";

const CONFIG: TicketsConfig = {
  ...ticketsModuleConfig.defaults,
  categoryId: CATEGORY,
  supportRoleIds: [SUPPORT],
  logChannelId: LOG,
};

const row = (patch: Partial<TicketRow> = {}): TicketRow => ({
  id: "t1",
  guildId: GUILD,
  ticketNumber: 7,
  channelId: NEW_CHANNEL,
  openerId: OPENER,
  status: "open",
  createdAt: new Date(),
  closedAt: null,
  closedById: null,
  ...patch,
});

function setup(
  options: {
    open?: TicketRow[];
    created?: TicketRow | null;
    createError?: Error;
    found?: TicketRow;
    closed?: TicketRow;
    portOverrides?: Partial<TicketsPort>;
  } = {},
) {
  const repository = {
    listOpenForUser: vi.fn(async () => options.open ?? []),
    createIfUnderLimit: vi.fn(async () => {
      if (options.createError) throw options.createError;
      return options.created === undefined ? row() : options.created;
    }),
    findOpenByChannel: vi.fn(async () => options.found),
    close: vi.fn(async () => options.closed),
  } satisfies TicketsRepository;
  const port = {
    createChannel: vi.fn(async () => ({ channelId: NEW_CHANNEL })),
    deleteChannel: vi.fn(async () => undefined),
    sendWelcome: vi.fn(async () => undefined),
    sendNotice: vi.fn(async () => undefined),
    archiveChannel: vi.fn(async () => undefined),
    postLog: vi.fn(async () => undefined),
    ...options.portOverrides,
  } satisfies TicketsPort;
  const service = createTicketsService({ repository });
  const open = (config: TicketsConfig = CONFIG) =>
    service.openTicket({
      guildId: GUILD,
      opener: { id: OPENER, username: "Ada Lovelace" },
      config,
      port,
      logger: createSilentLogger(),
    });
  const close = (closer: { id: string; roleIds?: string[]; hasManageChannels?: boolean }) =>
    service.closeTicket({
      guildId: GUILD,
      channelId: NEW_CHANNEL,
      closer: {
        id: closer.id,
        roleIds: new Set(closer.roleIds ?? []),
        hasManageChannels: closer.hasManageChannels ?? false,
      },
      config: CONFIG,
      port,
      logger: createSilentLogger(),
    });
  return { repository, port, service, open, close };
}

describe("buildTicketChannelName", () => {
  it("makes a Discord-safe name from any username", () => {
    expect(buildTicketChannelName("Ada Lovelace")).toBe("ticket-ada-lovelace");
    expect(buildTicketChannelName("  --x__Y!! ")).toBe("ticket-x-y");
  });

  it("falls back when nothing usable is left, and stays within the length limit", () => {
    expect(buildTicketChannelName("!!!")).toBe("ticket-member");
    expect(buildTicketChannelName("a".repeat(300))).toHaveLength(100);
  });
});

describe("openTicket", () => {
  it("creates the channel, records the ticket, welcomes the person, and logs it", async () => {
    const { open, port, repository } = setup();
    const result = await open();
    expect(result).toEqual({ status: "opened", channelId: NEW_CHANNEL, ticketNumber: 7 });
    expect(port.createChannel).toHaveBeenCalledWith({
      name: "ticket-ada-lovelace",
      categoryId: CATEGORY,
      openerId: OPENER,
      supportRoleIds: [SUPPORT],
    });
    expect(repository.createIfUnderLimit).toHaveBeenCalledWith(
      expect.objectContaining({ openerId: OPENER, channelId: NEW_CHANNEL, maxOpen: 1 }),
    );
    expect(port.sendWelcome).toHaveBeenCalledWith(expect.objectContaining({ ticketNumber: 7 }));
    expect(port.postLog).toHaveBeenCalledWith(LOG, expect.stringContaining("Ticket #7 opened"));
  });

  it("does nothing when no category is chosen yet", async () => {
    const { open, port } = setup();
    expect(await open({ ...CONFIG, categoryId: null })).toEqual({ status: "not-configured" });
    expect(port.createChannel).not.toHaveBeenCalled();
  });

  it("stops at the limit before creating a channel, and points at the open one", async () => {
    const { open, port } = setup({ open: [row()] });
    expect(await open()).toEqual({ status: "limit", channelIds: [NEW_CHANNEL] });
    expect(port.createChannel).not.toHaveBeenCalled();
  });

  it("removes the extra channel when two clicks raced and the other one won", async () => {
    const { open, port } = setup({ created: null });
    const result = await open();
    expect(result).toMatchObject({ status: "limit" });
    expect(port.deleteChannel).toHaveBeenCalledWith(NEW_CHANNEL);
    expect(port.sendWelcome).not.toHaveBeenCalled();
  });

  it("removes the channel when recording the ticket fails, then reports the error", async () => {
    const { open, port } = setup({ createError: new Error("db down") });
    await expect(open()).rejects.toThrow("db down");
    expect(port.deleteChannel).toHaveBeenCalledWith(NEW_CHANNEL);
  });

  it("still counts the ticket as opened when the welcome message or the log fails", async () => {
    const failing = vi.fn(async () => {
      throw new Error("missing permission");
    });
    const { open } = setup({ portOverrides: { sendWelcome: failing, postLog: failing } });
    expect(await open()).toMatchObject({ status: "opened" });
  });

  it("skips the log when no log channel is set", async () => {
    const { open, port } = setup();
    await open({ ...CONFIG, logChannelId: null });
    expect(port.postLog).not.toHaveBeenCalled();
  });
});

describe("canCloseTicket", () => {
  const closer = (patch: Partial<Parameters<typeof canCloseTicket>[0]["closer"]> = {}) => ({
    id: OTHER,
    roleIds: new Set<string>(),
    hasManageChannels: false,
    ...patch,
  });

  it("allows the opener, support roles, and people who manage channels", () => {
    const base = { openerId: OPENER, supportRoleIds: [SUPPORT] };
    expect(canCloseTicket({ ...base, closer: closer({ id: OPENER }) })).toBe(true);
    expect(canCloseTicket({ ...base, closer: closer({ roleIds: new Set([SUPPORT]) }) })).toBe(true);
    expect(canCloseTicket({ ...base, closer: closer({ hasManageChannels: true }) })).toBe(true);
  });

  it("refuses everyone else", () => {
    expect(canCloseTicket({ openerId: OPENER, supportRoleIds: [SUPPORT], closer: closer() })).toBe(
      false,
    );
  });
});

describe("closeTicket", () => {
  it("closes it, locks the opener out, says so in the channel, and logs it", async () => {
    const { close, port, repository } = setup({ found: row(), closed: row({ status: "closed" }) });
    expect(await close({ id: OPENER })).toEqual({ status: "closed", ticketNumber: 7 });
    expect(repository.close).toHaveBeenCalledWith(GUILD, NEW_CHANNEL, OPENER);
    expect(port.archiveChannel).toHaveBeenCalledWith(NEW_CHANNEL, OPENER);
    expect(port.sendNotice).toHaveBeenCalledWith(NEW_CHANNEL, expect.stringContaining("closed by"));
    expect(port.postLog).toHaveBeenCalledWith(LOG, expect.stringContaining("Ticket #7 closed"));
  });

  it("ignores a channel that is not an open ticket", async () => {
    const { close, repository } = setup({ found: undefined });
    expect(await close({ id: OPENER })).toEqual({ status: "not-a-ticket" });
    expect(repository.close).not.toHaveBeenCalled();
  });

  it("refuses someone with no right to close it, without changing anything", async () => {
    const { close, repository, port } = setup({ found: row() });
    expect(await close({ id: OTHER })).toEqual({ status: "forbidden" });
    expect(repository.close).not.toHaveBeenCalled();
    expect(port.archiveChannel).not.toHaveBeenCalled();
  });

  it("does nothing the second time when two people press Close together", async () => {
    const { close, port } = setup({ found: row(), closed: undefined });
    expect(await close({ id: OPENER })).toEqual({ status: "not-a-ticket" });
    expect(port.sendNotice).not.toHaveBeenCalled();
  });

  it("keeps the ticket closed even if locking the channel fails", async () => {
    const failing = vi.fn(async () => {
      throw new Error("no permission");
    });
    const { close } = setup({
      found: row(),
      closed: row({ status: "closed" }),
      portOverrides: { archiveChannel: failing },
    });
    expect(await close({ id: OPENER })).toMatchObject({ status: "closed" });
  });
});

describe("handleChannelDeleted", () => {
  it("closes the ticket with nobody credited", async () => {
    const { service, repository } = setup();
    await service.handleChannelDeleted(GUILD, NEW_CHANNEL);
    expect(repository.close).toHaveBeenCalledWith(GUILD, NEW_CHANNEL, null);
  });
});
