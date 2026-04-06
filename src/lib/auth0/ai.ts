import { Auth0AI, getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { auth0 } from "./client";

const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CUSTOM_API_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CUSTOM_API_CLIENT_SECRET!,
  },
});

export const withGoogleReadOnly = auth0AI.withTokenVault({
  connection: "google-oauth2",
  scopes: ["openid", "https://www.googleapis.com/auth/gmail.readonly"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withGoogleCalendarReadOnly = auth0AI.withTokenVault({
  connection: "google-oauth2",
  scopes: ["openid", "https://www.googleapis.com/auth/calendar.readonly"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withGoogleWrite = auth0AI.withTokenVault({
  connection: "google-oauth2",
  scopes: ["openid", "https://www.googleapis.com/auth/gmail.send"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withGitHubReadOnly = auth0AI.withTokenVault({
  connection: "github",
  scopes: ["public_repo", "read:user"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withGitHubWrite = auth0AI.withTokenVault({
  connection: "github",
  scopes: ["repo"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withSlackReadOnly = auth0AI.withTokenVault({
  connection: "sign-in-with-slack",
  scopes: ["channels:read"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export const withSlackWrite = auth0AI.withTokenVault({
  connection: "sign-in-with-slack",
  scopes: ["chat:write"],
  refreshToken: async () => {
    const session = await auth0.getSession();
    return session?.tokenSet?.refreshToken;
  },
});

export async function getTokenForConnection(): Promise<string> {
  return getAccessTokenFromTokenVault();
}

export const withAsyncAuthorization = auth0AI.withAsyncAuthorization({
  userID: async () => {
    const session = await auth0.getSession();
    return session?.user?.sub as string;
  },
  bindingMessage: async (params: any) =>
    `Approve: ${params.action || "Execute action"}`,
  scopes: ["openid"],
  audience: process.env.AUTH0_AUDIENCE!,
  onAuthorizationRequest: async (authReq: any, creds: any) => {
    console.log("Authorization request sent to user device");
    await creds;
    console.log("User approved the request");
  },
  onUnauthorized: async (e: Error) => {
    return `User denied: ${e.message}`;
  },
});

export { auth0AI };
