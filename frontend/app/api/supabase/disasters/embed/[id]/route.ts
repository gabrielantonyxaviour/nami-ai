import { NextResponse } from "next/server";
import { getEmbedDisaster } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disaster = await getEmbedDisaster(parseInt(params.id));

    if (!disaster) {
      return NextResponse.json(
        { error: "Disaster not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(disaster);
  } catch (error) {
    console.error("Error fetching disaster:", error);
    return NextResponse.json(
      { error: "Failed to fetch disaster" },
      { status: 500 }
    );
  }
}
