import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = (() => {
  try {
    return new Auth0Client({
      authorizationParameters: {
        scope: "openid profile email offline_access",
      },
      enableConnectAccountEndpoint: true,
    });
  } catch (error) {
    console.warn("⚠️ Auth0Client initialization failed. Missing env vars? Running in Demo Mode fallback.");
    return {
      getSession: async () => null,
      getAccessToken: async () => null,
      getAccessTokenForConnection: async () => null,
      handleAuth: () => (req: any, ctx: any) => NextResponse.json({ error: "Auth0 Disabled" }, { status: 400 }),
      middleware: async (req: any) => NextResponse.next(),
    } as any;
  }
})();

export async function getAccessToken() {
  if (!auth0 || !auth0.getAccessToken) throw new Error("Auth0 not configured. Please ensure AUTH0_SECRET and other variables are set.");
  const tokenResult = await auth0.getAccessToken();
  if (!tokenResult || !tokenResult.token) {
    throw new Error("No access token found in Auth0 session");
  }
  return tokenResult.token;
}

export async function getSession() {
  if (!auth0 || !auth0.getSession) return null;
  return await auth0.getSession();
}
