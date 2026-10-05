"use client";

import { Plus, X } from "lucide-react";

import { MAX_ROLE_REWARDS } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { NumberInput } from "./fields/number-input";
import { RoleSelect } from "./fields/role-select";
import type { RoleOption } from "./guild-resources";

const FIRST_REWARD_LEVEL = 5;
const LEVEL_STEP = 5;
const MAX_LEVEL = 500;

export interface RoleReward {
  level: number;
  roleId: string;
}

/** The next level that has no reward yet, in steps of five, so adding a row never collides. */
function nextFreeLevel(rewards: RoleReward[]): number {
  const used = new Set(rewards.map((reward) => reward.level));
  let level = FIRST_REWARD_LEVEL;
  while (used.has(level)) level += LEVEL_STEP;
  return level;
}

interface RewardRowProps {
  index: number;
  reward: RoleReward;
  roles: RoleOption[];
  levelError: string | undefined;
  onChange: (patch: Partial<RoleReward>) => void;
  onRemove: () => void;
}

/** One "at level N, give role R" line. A role Forgely can't hand out stays visible but can't be newly picked. */
function RewardRow({ index, reward, roles, levelError, onChange, onRemove }: RewardRowProps) {
  const levelId = `reward-level-${index}`;

  return (
    <li className="flex flex-wrap items-start gap-3">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={levelId} className="text-sm text-muted">
            At level
          </label>
          <NumberInput
            id={levelId}
            value={reward.level}
            min={1}
            max={MAX_LEVEL}
            onChange={(level) => onChange({ level })}
            aria-label={`Level for reward ${index + 1}`}
            aria-describedby={levelError ? `${levelId}-error` : undefined}
          />
        </div>
        {levelError && (
          <p id={`${levelId}-error`} role="alert" className="mt-1 text-sm text-danger">
            {levelError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`reward-role-${index}`} className="text-sm text-muted">
          give
        </label>
        <RoleSelect
          id={`reward-role-${index}`}
          value={reward.roleId}
          roles={roles}
          onChange={(roleId) => onChange({ roleId })}
          className="w-56"
        />
      </div>

      <button
        type="button"
        aria-label={`Remove reward ${index + 1}`}
        onClick={onRemove}
        className="grid size-10 cursor-pointer place-items-center rounded-full border border-line text-muted transition-colors hover:border-danger hover:text-fg"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

interface RoleRewardsEditorProps {
  rewards: RoleReward[];
  /** Null when Discord could not be reached, so roles are unknown. */
  roles: RoleOption[] | null;
  onChange: (rewards: RoleReward[]) => void;
  /** Server messages by path, e.g. "roleRewards" or "roleRewards.0.level". */
  fieldError: (path: string) => string | undefined;
}

/** The list of role rewards, with add and remove. */
export function RoleRewardsEditor({
  rewards,
  roles,
  onChange,
  fieldError,
}: RoleRewardsEditorProps) {
  if (roles === null) {
    return (
      <p className="text-sm text-muted">
        Couldn&apos;t load this server&apos;s roles from Discord. Reload the page to try again.
      </p>
    );
  }

  const firstAssignable = roles.find((role) => role.isAssignable);
  const update = (index: number, patch: Partial<RoleReward>): void =>
    onChange(
      rewards.map((reward, position) => (position === index ? { ...reward, ...patch } : reward)),
    );

  return (
    <div>
      {rewards.length === 0 && <p className="mb-3 text-sm text-muted">No role rewards yet.</p>}
      <ul className="m-0 grid list-none gap-3 p-0">
        {rewards.map((reward, index) => (
          <RewardRow
            key={index}
            index={index}
            reward={reward}
            roles={roles}
            levelError={fieldError(`roleRewards.${index}.level`)}
            onChange={(patch) => update(index, patch)}
            onRemove={() => onChange(rewards.filter((_, position) => position !== index))}
          />
        ))}
      </ul>

      {fieldError("roleRewards") && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {fieldError("roleRewards")}
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={!firstAssignable || rewards.length >= MAX_ROLE_REWARDS}
          onClick={() =>
            firstAssignable &&
            onChange([...rewards, { level: nextFreeLevel(rewards), roleId: firstAssignable.id }])
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a reward
        </Button>
        {!firstAssignable && (
          <p className="mt-2 text-sm text-muted">
            No role can be given yet. Move the Forgely role above the roles you want to hand out in
            Server Settings.
          </p>
        )}
      </div>
    </div>
  );
}
