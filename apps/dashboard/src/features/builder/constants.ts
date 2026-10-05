/** The only permission bits the builder ever touches, each with why. */
export const PERMISSION = {
  viewChannel: 1n << 10n,
  sendMessages: 1n << 11n,
  readMessageHistory: 1n << 16n,
  connect: 1n << 20n,
  createPublicThreads: 1n << 35n,
  createPrivateThreads: 1n << 36n,
  sendMessagesInThreads: 1n << 38n,
} as const;
