"use client";

import Image from "next/image";
import { useState } from "react";
import ToggleTheme from "../ui/custom/toggle-theme";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { useRouter, usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = pathname?.split("/");

  console.log(pathParts);

  return (pathParts.length > 1 && pathParts[1] == "embed") ||
    (pathParts.length > 3 && pathParts[3] == "embed") ? (
    <div className="h-screen flex flex-col w-screen select-text bg-[#F5EFE0]">
      {children}
    </div>
  ) : !loading ? (
    <div className="h-screen flex flex-col w-screen select-text bg-[#FFFCF8]">
      <div className="flex justify-between p-4">
        <div
          className="flex space-x-2 items-center cursor-pointer"
          onClick={() => {
            router.push("/");
          }}
        >
          <Image
            src={"/logo.png"}
            height={40}
            width={40}
            alt="logo"
            className="rounded-full"
          />
          <p className="font-light text-2xl nouns tracking-widest">NAMI</p>
        </div>
        <div className="flex space-x-2 items-center"></div>
      </div>
      {children}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen w-screen space-y-4">
      <Image src="/loading.gif" width={200} height={200} alt="loading" />
      <p className="text-xl sen">Loading</p>
    </div>
  );
}
