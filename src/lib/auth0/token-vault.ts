/**
 * Token Vault Service
 *
 * Manages OAuth token exchange for external services via Auth0 Token Vault.
 *
 * Flow:
 * 1. User connects external account (Google, GitHub, Slack) via Auth0 Connected Accounts
 * 2. Auth0 stores tokens securely in Token Vault
 * 3. This service exchanges Auth0 tokens for provider tokens via Token Vault
 * 4. Tools use provider tokens to call APIs
 *
 * The agent NEVER sees raw credentials or refresh tokens.
 */

import { auth0 } from "./client";

export interface ConnectionStatus {
  google: boolean;
  github: boolean;
  slack: boolean;
  microsoft: boolean;
}

export interface TokenVaultResult {
  accessToken: string;
  connection: string;
  scopes: string[];
}

export async function getAccessTokenForConnection(
  connection: string
): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.tokenSet?.refreshToken) {
    throw new Error("No refresh token available in session");
  }

  const tokenResult = await auth0.getAccessTokenForConnection({
    connection,
  });

  if (!tokenResult?.token) {
    throw new Error(
      `Could not obtain access token for connection: ${connection}`
    );
  }

  return tokenResult.token;
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const session = await auth0.getSession();
  if (!session) {
    return { google: false, github: false, slack: false, microsoft: false };
  }

  const connectedAccounts = session.user?.connectedAccounts || [];
  const connectionIds = connectedAccounts.map(
    (ca: any) => ca.connection || ca.provider || ""
  );

  return {
    google: connectionIds.some(
      (id: string) =>
        id === "google-oauth2" || id === "google-workspace" || id === "google"
    ),
    github: connectionIds.some(
      (id: string) => id === "github" || id === "github-enterprise"
    ),
    slack: connectionIds.some(
      (id: string) =>
        id === "sign-in-with-slack" || id === "slack" || id === "slack-oauth2"
    ),
    microsoft: connectionIds.some(
      (id: string) =>
        id === "windowslive" ||
        id === "microsoft" ||
        id === "azure-ad" ||
        id === "ms-oauth2"
    ),
  };
}

export function getDemoConnectionStatus(): ConnectionStatus {
  return { google: true, github: true, slack: true, microsoft: true };
}
