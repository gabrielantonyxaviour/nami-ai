import { NextResponse } from "next/server";
import { getNGO } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ngoData = await getNGO(parseInt(params.id));

    if (!ngoData.ngo) {
      return NextResponse.json({ error: "NGO not found" }, { status: 404 });
    }

    return NextResponse.json(ngoData);
  } catch (error) {
    console.error("Error fetching NGO data:", error);
    return NextResponse.json(
      { error: "Failed to fetch NGO data" },
      { status: 500 }
    );
  }
}
