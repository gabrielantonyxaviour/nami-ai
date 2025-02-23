import { NextResponse } from "next/server";
import { getDisasters } from "@/lib/supabase";

export async function GET() {
  try {
    const disasters = await getDisasters();
    return NextResponse.json(disasters);
  } catch (error) {
    console.error("Error fetching disasters:", error);
    return NextResponse.json(
      { error: "Failed to fetch disasters" },
      { status: 500 }
    );
  }
}
