/** Stable machine-readable error codes, shared by bot replies and API responses. */
export const ERROR_CODES = {
  permission: "PERMISSION_DENIED",
  validation: "VALIDATION_FAILED",
  discordApi: "DISCORD_API_ERROR",
  notFound: "NOT_FOUND",
  moduleDisabled: "MODULE_DISABLED",
  aiUnavailable: "AI_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

interface ForgelyErrorOptions {
  /** Safe to show to end users. Never put internal details here. */
  userMessage: string;
  cause?: unknown;
}

/** Base class for every error we expect and know how to explain to the user. */
export abstract class ForgelyError extends Error {
  abstract readonly code: ErrorCode;
  readonly userMessage: string;

  constructor(message: string, options: ForgelyErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.userMessage = options.userMessage;
  }
}

export class PermissionError extends ForgelyError {
  readonly code = ERROR_CODES.permission;

  constructor(message: string, userMessage = "You don't have permission to do that.") {
    super(message, { userMessage });
  }
}

export class ValidationError extends ForgelyError {
  readonly code = ERROR_CODES.validation;

  constructor(message: string, userMessage = "That input isn't valid.", cause?: unknown) {
    super(message, { userMessage, cause });
  }
}

export class DiscordApiError extends ForgelyError {
  readonly code = ERROR_CODES.discordApi;

  constructor(message: string, cause?: unknown) {
    super(message, {
      userMessage: "Discord rejected that request. Check my permissions and try again.",
      cause,
    });
  }
}

export class NotFoundError extends ForgelyError {
  readonly code = ERROR_CODES.notFound;

  constructor(message: string, userMessage = "I couldn't find that.") {
    super(message, { userMessage });
  }
}

export class ModuleDisabledError extends ForgelyError {
  readonly code = ERROR_CODES.moduleDisabled;

  constructor(moduleId: string) {
    super(`Module "${moduleId}" is disabled for this guild`, {
      userMessage: "That feature is turned off on this server.",
    });
  }
}

/** The AI provider failed, was overloaded, or kept returning something unusable. Safe to retry later. */
export class AiUnavailableError extends ForgelyError {
  readonly code = ERROR_CODES.aiUnavailable;

  constructor(message: string, cause?: unknown) {
    super(message, {
      userMessage:
        "The AI couldn't produce a plan right now. Nothing was changed. Try again in a minute.",
      cause,
    });
  }
}
