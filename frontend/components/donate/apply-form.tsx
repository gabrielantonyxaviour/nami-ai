"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NgoFormData {
  name: string;
  description: string;
  location: string;
  image: File | null;
}
export default function ApplyForm({ id }: { id: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NgoFormData>({
    name: "",
    description: "",
    location: "",
    image: null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));

      // Create preview URL for the selected image
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Clean up the preview URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.name ||
      !formData.description ||
      !formData.location ||
      !formData.image
    ) {
      // toast({
      //   title: "Missing Information",
      //   description: "Please fill in all fields and upload an image.",
      //   variant: "destructive",
      // });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData object to handle file upload
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("description", formData.description);
      submitData.append("location", formData.location);
      if (formData.image) {
        submitData.append("image", formData.image);
      }

      // Send the data to the API endpoint
      const response = await fetch("/api/supabase/ngos/create", {
        method: "POST",
        body: submitData,
      });
      const { id: ngoId } = await response.json();

      if (!response.ok) {
        throw new Error("Failed to submit NGO information");
      }

      // Reset form after successful submission
      setFormData({
        name: "",
        description: "",
        location: "",
        image: null,
      });
      setPreviewUrl(null);

      const response2 = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ngoId,
          disasterId: id,
        }),
      });
      const { response: reason, amount } = await response2.json();
      if (reason) {
      } else {
      }

      // toast({
      //   title: "Success!",
      //   description: "NGO information has been submitted successfully.",
      // });
    } catch (error) {
      console.error("Error submitting NGO form:", error);
      // toast({
      //   title: "Submission Failed",
      //   description:
      //     "There was a problem submitting your information. Please try again.",
      //   variant: "destructive",
      // });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl sen">
      <Card>
        <CardHeader>
          <CardTitle className="nouns tracking-widest text-2xl">
            Apply for Claim
          </CardTitle>
          <CardDescription>
            Enter the information of the NGO you'd like to register.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">NGO Name</Label>
              <Input
                id="name"
                name="name"
                placeholder=""
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What does your NGO do?"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Where are you based?"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">NGO Image</Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
              />

              {previewUrl && (
                <div className="mt-4 relative h-48 rounded-md overflow-hidden border">
                  <Image
                    src={previewUrl}
                    alt="NGO image preview"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Register NGO"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
