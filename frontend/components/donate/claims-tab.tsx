// This would typically be in a Next.js page or component file
// e.g., app/claims/page.tsx or components/ClaimCards.tsx

"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NGO, StarkClaim } from "@/lib/type";

const ngos: Omit<NGO, "address">[] = [
  {
    id: 1,
    created_at: "2023-11-15T09:00:00Z",
    name: "Global Relief Initiative",
    image: "/api/placeholder/400/200",
    description:
      "Providing emergency aid and long-term support to communities affected by natural disasters worldwide.",
    location: "Geneva, Switzerland",
  },
  {
    id: 2,
    created_at: "2023-12-03T14:30:00Z",
    name: "Oceanwater Conservation Society",
    image: "/api/placeholder/400/200",
    description:
      "Dedicated to preserving marine ecosystems and supporting coastal communities through sustainable practices.",
    location: "San Diego, USA",
  },
  {
    id: 3,
    created_at: "2024-01-21T11:45:00Z",
    name: "Children First Foundation",
    image: "/api/placeholder/400/200",
    description:
      "Focusing on the health, education, and welfare of children in underprivileged communities.",
    location: "London, UK",
  },
  {
    id: 4,
    created_at: "2024-02-08T16:15:00Z",
    name: "Rainforest Alliance",
    image: "/api/placeholder/400/200",
    description:
      "Working to protect tropical forests and promote sustainable agriculture practices.",
    location: "Brasília, Brazil",
  },
  {
    id: 5,
    created_at: "2024-03-17T10:20:00Z",
    name: "Crisis Response Team",
    image: "/api/placeholder/400/200",
    description:
      "Rapid deployment of emergency services and resources to disaster-affected areas.",
    location: "Tokyo, Japan",
  },
];

// Create dummy StarkClaim data with associated NGOs
const starkClaims: StarkClaim[] = [
  {
    id: 101,
    claimed_at: "2024-02-10T08:45:00Z",
    ngo: 1,
    disaster: 1001,
    amount: 50000,
    tweet_url: "https://twitter.com/GlobalRelief/status/1234567890",
    ngo_details: ngos[0],
  },
  {
    id: 102,
    claimed_at: "2024-02-15T13:20:00Z",
    ngo: 2,
    disaster: 1002,
    amount: 35000,
    tweet_url: "https://twitter.com/OceanConservation/status/1234567891",
    ngo_details: ngos[1],
  },
  {
    id: 103,
    claimed_at: "2024-02-28T09:10:00Z",
    ngo: 3,
    disaster: 1003,
    amount: 75000,
    tweet_url: "https://twitter.com/ChildrenFirst/status/1234567892",
    ngo_details: ngos[2],
  },
  {
    id: 104,
    claimed_at: "2024-03-05T16:30:00Z",
    ngo: 4,
    disaster: 1004,
    amount: 42000,
    tweet_url: "https://twitter.com/RainforestAlliance/status/1234567893",
    ngo_details: ngos[3],
  },
  {
    id: 105,
    claimed_at: "2024-03-12T11:15:00Z",
    ngo: 5,
    disaster: 1001,
    amount: 60000,
    tweet_url: "https://twitter.com/CrisisResponse/status/1234567894",
    ngo_details: ngos[4],
  },
  {
    id: 106,
    claimed_at: "2024-03-18T14:45:00Z",
    ngo: 1,
    disaster: 1005,
    amount: 55000,
    tweet_url: "https://twitter.com/GlobalRelief/status/1234567895",
    ngo_details: ngos[0],
  },
  {
    id: 107,
    claimed_at: "2024-04-02T10:30:00Z",
    ngo: 3,
    disaster: 1006,
    amount: 38000,
    tweet_url: "https://twitter.com/ChildrenFirst/status/1234567896",
    ngo_details: ngos[2],
  },
  {
    id: 108,
    claimed_at: "2024-04-10T15:20:00Z",
    ngo: 5,
    disaster: 1007,
    amount: 70000,
    tweet_url: "https://twitter.com/CrisisResponse/status/1234567897",
    ngo_details: ngos[4],
  },
];

const ClaimsTab = ({ id, claims }: { id: string; claims: StarkClaim[] }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Format the amount as currency
  const formatAmount = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format the date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">NGO Claims</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto space-x-4 pb-4 -mx-4 px-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {starkClaims.map((claim) => (
          <Card
            key={claim.id}
            className="min-w-[300px] max-w-[300px] flex-shrink-0"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50">
                  Claim #{claim.id}
                </Badge>
                <Badge variant="secondary">{formatAmount(claim.amount)}</Badge>
              </div>
              <CardTitle className="mt-2 text-lg">
                {claim.ngo_details?.name || "Unknown NGO"}
              </CardTitle>
              <CardDescription>
                Claimed on {formatDate(claim.claimed_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Avatar>
                  <AvatarImage
                    src={claim.ngo_details?.image || "/api/placeholder/40/40"}
                    alt={claim.ngo_details?.name || "NGO"}
                  />
                  <AvatarFallback>
                    {claim.ngo_details?.name?.charAt(0) || "N"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {claim.ngo_details?.location || "Location Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Disaster ID: {claim.disaster || "N/A"}
                  </p>
                </div>
              </div>
              <p className="text-sm line-clamp-3">
                {claim.ngo_details?.description || "No description available."}
              </p>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              {claim.tweet_url ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full hover:bg-primary hover:text-white"
                  onClick={() => window.open(claim.tweet_url || "#", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Tweet
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full" disabled>
                  No Tweet Available
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ClaimsTab;
