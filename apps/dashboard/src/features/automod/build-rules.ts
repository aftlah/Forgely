import type { AutomodConfig } from "@forgely/shared";

import {
  AUTOMOD_ACTION,
  AUTOMOD_EVENT_MESSAGE_SEND,
  AUTOMOD_PRESET,
  AUTOMOD_TRIGGER,
  type AutomodRulePayload,
} from "@/lib/discord-automod-rest";

/** Every rule Forgely makes starts with this, which is how it finds its own rules again. */
export const RULE_PREFIX = "Forgely · ";

export const RULE_NAMES = {
  words: `${RULE_PREFIX}Blocked words`,
  invites: `${RULE_PREFIX}Invite links`,
  spam: `${RULE_PREFIX}Spam`,
  language: `${RULE_PREFIX}Language filter`,
  mentions: `${RULE_PREFIX}Mention spam`,
} as const;

/** Matches discord.gg/code and discord.com/invite/code. Discord uses Rust-style regular expressions. */
const INVITE_PATTERN =
  "(?:https?://)?(?:www\\.)?(?:discord\\.gg|discord(?:app)?\\.com/invite)/[a-z0-9-]+";

type Actions = AutomodRulePayload["actions"];

/**
 * What Discord does when a rule fires: always block the message, optionally post a note, and (only where
 * Discord allows it) time the member out.
 */
function buildActions(config: AutomodConfig, canTimeout: boolean): Actions {
  const actions: Actions = [{ type: AUTOMOD_ACTION.blockMessage }];
  if (config.alertChannelId) {
    actions.push({
      type: AUTOMOD_ACTION.sendAlert,
      metadata: { channel_id: config.alertChannelId },
    });
  }
  if (canTimeout && config.timeoutSeconds) {
    actions.push({
      type: AUTOMOD_ACTION.timeout,
      metadata: { duration_seconds: config.timeoutSeconds },
    });
  }
  return actions;
}

function presetIds(config: AutomodConfig): number[] {
  const { profanity, sexualContent, slurs } = config.presets;
  return [
    ...(profanity ? [AUTOMOD_PRESET.profanity] : []),
    ...(sexualContent ? [AUTOMOD_PRESET.sexualContent] : []),
    ...(slurs ? [AUTOMOD_PRESET.slurs] : []),
  ];
}

/** One rule, with the settings every rule shares filled in. */
function rule(
  config: AutomodConfig,
  name: string,
  trigger: number,
  options: { metadata?: Record<string, unknown>; canTimeout?: boolean } = {},
): AutomodRulePayload {
  return {
    name,
    event_type: AUTOMOD_EVENT_MESSAGE_SEND,
    trigger_type: trigger,
    ...(options.metadata ? { trigger_metadata: options.metadata } : {}),
    actions: buildActions(config, options.canTimeout ?? false),
    enabled: true,
    exempt_roles: config.exemptRoleIds,
  };
}

/**
 * The AutoMod rules the settings call for. A setting that is off produces no rule, so turning it off removes
 * the rule from Discord.
 */
export function buildDesiredRules(config: AutomodConfig): AutomodRulePayload[] {
  const rules: AutomodRulePayload[] = [];
  if (config.blockedWords.length > 0) {
    rules.push(
      rule(config, RULE_NAMES.words, AUTOMOD_TRIGGER.keyword, {
        metadata: { keyword_filter: config.blockedWords },
        canTimeout: true,
      }),
    );
  }
  if (config.blockInvites) {
    rules.push(
      rule(config, RULE_NAMES.invites, AUTOMOD_TRIGGER.keyword, {
        metadata: { regex_patterns: [INVITE_PATTERN] },
        canTimeout: true,
      }),
    );
  }
  if (config.blockSpam) rules.push(rule(config, RULE_NAMES.spam, AUTOMOD_TRIGGER.spam));

  const presets = presetIds(config);
  if (presets.length > 0) {
    rules.push(
      rule(config, RULE_NAMES.language, AUTOMOD_TRIGGER.keywordPreset, { metadata: { presets } }),
    );
  }
  if (config.mentionLimit !== null) {
    rules.push(
      rule(config, RULE_NAMES.mentions, AUTOMOD_TRIGGER.mentionSpam, {
        metadata: { mention_total_limit: config.mentionLimit },
        canTimeout: true,
      }),
    );
  }
  return rules;
}
