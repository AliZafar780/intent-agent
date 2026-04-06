import { Auth0Client } from "@auth0/nextjs-auth0/server";

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
    return null as any;
  }
})();

export async function getAccessToken() {
  if (!auth0) throw new Error("Auth0 not configured. Please ensure AUTH0_SECRET and other variables are set.");
  const tokenResult = await auth0.getAccessToken();
  if (!tokenResult || !tokenResult.token) {
    throw new Error("No access token found in Auth0 session");
  }
  return tokenResult.token;
}

export async function getSession() {
  if (!auth0) return null;
  return await auth0.getSession();
}
