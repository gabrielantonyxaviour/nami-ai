import { NextResponse } from "next/server";
import { createNGO } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ngo = await createNGO(body);
    return NextResponse.json(ngo);
  } catch (error) {
    console.error("Error creating NGO:", error);
    return NextResponse.json(
      { error: "Failed to create NGO" },
      { status: 500 }
    );
  }
}
