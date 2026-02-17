import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }   // ← params is now a Promise
) {
  try {
    // ✅ Must await params in Next.js 15
    const { id: pollId } = await context.params;
    
    const body = await request.json();
    const optionId = body.option_id;

    console.log("Poll ID:", pollId);
    console.log("Option ID:", optionId);

    if (!pollId || !optionId) {
      return NextResponse.json(
        { error: "Missing poll ID or option ID" },
        { status: 400 }
      );
    }

    const ipHash = await hashIP(getClientIP(request));

    // Check if already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted in this poll" },
        { status: 403 }
      );
    }

    // Save vote
    const { error: voteError } = await supabase
      .from("votes")
      .insert({ poll_id: pollId, option_id: optionId, ip_hash: ipHash });

    if (voteError) {
      console.error("Vote error:", voteError);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    // Get current count
    const { data: option } = await supabase
      .from("options")
      .select("votes_count")
      .eq("id", optionId)
      .single();

    if (!option) {
      return NextResponse.json(
        { error: "Option not found" },
        { status: 404 }
      );
    }

    // Increment by 1
    const newCount = Number(option.votes_count) + 1;

    const { error: updateError } = await supabase
      .from("options")
      .update({ votes_count: newCount })
      .eq("id", optionId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update vote count" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newCount });

  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}