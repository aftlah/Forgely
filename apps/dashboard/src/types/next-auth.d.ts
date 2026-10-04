import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** `id` is the user's Discord ID. The Discord access token is never part of the session. */
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    /** Server-side only: read with `readDiscordAccessToken()`, never put in the session. */
    accessToken?: string;
    /** Unix seconds. */
    accessTokenExpiresAt?: number;
  }
}
