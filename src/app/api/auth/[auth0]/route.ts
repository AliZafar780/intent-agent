import { auth0 } from "@/lib/auth0/client";
import { NextResponse } from "next/server";

export const GET = (req: any, ctx: any) => {
  if (auth0 && typeof auth0.handleAuth === "function") {
    return auth0.handleAuth()(req, ctx);
  }
  return NextResponse.json({ error: "Auth0 disabled in Demo Mode" });
};
