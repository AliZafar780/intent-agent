import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email offline_access",
  },
  enableConnectAccountEndpoint: true,
});

export async function getAccessToken() {
  const tokenResult = await auth0.getAccessToken();
  if (!tokenResult || !tokenResult.token) {
    throw new Error("No access token found in Auth0 session");
  }
  return tokenResult.token;
}

export async function getSession() {
  return await auth0.getSession();
}
