import { auth0 } from "@/lib/auth0/client";

export const GET = auth0 ? auth0.handleAuth() : async () => new Response("Demo Mode: Auth0 Disabled", { status: 200 });
