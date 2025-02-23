import { NextResponse } from "next/server";
import { createClaim } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const claim = await createClaim(body);
    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    );
  }
}
