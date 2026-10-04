import { headers } from "next/headers";
import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import Discord from "next-auth/providers/discord";

/** Matches the lifetime of a Discord access token (7 days), so the cookie and the token expire together. */
const SESSION_MAX_AGE_SECONDS = 604_800;
const MS_PER_SECOND = 1000;

/**
 * Sign-in with Discord. Scopes: `identify` (who they are) and `guilds` (which servers they are in
 * and with what permissions). Nothing else is requested.
 *
 * The Discord access token is kept inside the encrypted session cookie but is deliberately left
 * out of the `session` object, because `/api/auth/session` returns that object to browser scripts.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Discord({ authorization: { params: { scope: "identify guilds" } } })],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    jwt({ token, account, profile }) {
      // `account` and `profile` only exist on the request that completes the sign-in.
      if (account && profile) {
        token.discordId = String(profile.id);
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      if (token.discordId) session.user.id = token.discordId;
      return session;
    },
  },
});

/**
 * Server-side only. Returns the signed-in user's Discord access token, or null when there is none
 * or it has expired (the user then has to sign in again).
 */
export async function readDiscordAccessToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
  });
  if (!token?.accessToken) return null;

  const expiresAtSeconds = token.accessTokenExpiresAt;
  const hasExpired =
    expiresAtSeconds !== undefined && expiresAtSeconds * MS_PER_SECOND <= Date.now();
  return hasExpired ? null : token.accessToken;
}
