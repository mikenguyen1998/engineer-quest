import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = new URL("/", url.origin);

  if (!code) {
    destination.searchParams.set("authError", "Missing sign-in code. Request a new magic link.");
    return NextResponse.redirect(destination);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) destination.searchParams.set("authError", error.message);
  } catch {
    destination.searchParams.set("authError", "Supabase is not configured correctly.");
  }

  return NextResponse.redirect(destination);
}
