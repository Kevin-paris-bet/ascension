import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  const supabase = await createSupabaseServerClient(response);

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/?auth=configuration", requestUrl.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined
  );

  if (error) {
    return NextResponse.redirect(new URL("/?auth=invalid-link", requestUrl.origin));
  }

  return response;
}
