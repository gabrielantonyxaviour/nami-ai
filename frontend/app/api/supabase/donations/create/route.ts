import { NextResponse } from "next/server";
import { createDonation } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const donation = await createDonation(body);
    return NextResponse.json(donation);
  } catch (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: "Failed to create donation" },
      { status: 500 }
    );
  }
}
