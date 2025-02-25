import { NextResponse } from "next/server";
import { createNGO } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Extract all the fields from form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const imageFile = formData.get("image") as File;
    const address = formData.get("address") as string;

    // Validate required fields
    if (!name || !description || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle the image file
    let imageData = null;
    if (imageFile) {
      // You have two options for handling the image:

      // Option 1: Convert the image to base64 to store in Supabase directly
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      imageData = {
        fileName: imageFile.name,
        fileType: imageFile.type,
        base64Data: `data:${imageFile.type};base64,${base64Image}`,
      };

      // Option 2: If you're planning to upload the image to Supabase Storage,
      // you would pass the file as is to your createNGO function which would
      // handle the upload, but for proper typing:
      // imageData = imageFile;
    }

    // Create the NGO object to pass to the createNGO function
    const ngoData = {
      name,
      description,
      location,
      image: "https://via.placeholder.com/400x200",
      address,
    };

    // Call the createNGO function with the prepared data
    const ngo = await createNGO(ngoData);

    return NextResponse.json(ngo);
  } catch (error) {
    console.error("Error creating NGO:", error);
    return NextResponse.json(
      { error: "Failed to create NGO" },
      { status: 500 }
    );
  }
}
