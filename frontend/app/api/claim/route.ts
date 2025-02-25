import { NextResponse } from "next/server";
import { createClaim } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const AI_URL = process.env.AI_URL || "";
    if (!AI_URL) {
      return NextResponse.json({ error: "AI_URL not found" }, { status: 500 });
    }
    const requestBody = {
      ngoId: body.ngoId,
      disasterId: body.disasterId,
    };

    const response = await fetch(AI_URL + "/evaluation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.amount) {
      return NextResponse.json({ amount: data.amount });
    } else {
      return NextResponse.json({ response: data.response });
    }
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    );
  }
}
