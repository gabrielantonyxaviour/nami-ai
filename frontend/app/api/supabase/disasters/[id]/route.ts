import { NextResponse } from "next/server";
import { getPageDisaster } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disasterData = await getPageDisaster(parseInt(params.id));

    if (!disasterData.disaster) {
      return NextResponse.json(
        { error: "Disaster not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(disasterData);
  } catch (error) {
    console.error("Error fetching disaster data:", error);
    return NextResponse.json(
      { error: "Failed to fetch disaster data" },
      { status: 500 }
    );
  }
}
