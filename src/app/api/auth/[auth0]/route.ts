import { auth0 } from "@/lib/auth0/client";
import { NextResponse } from "next/server";

export const GET = auth0 
  ? auth0.handleAuth() 
  : async () => NextResponse.json({ error: "Auth0 disabled in Demo Mode" });
