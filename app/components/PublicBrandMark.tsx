"use client";

import Image from "next/image";

export default function PublicBrandMark() {
  return (
    <section className="relative hidden lg:block h-[20rem]">
      <div className="absolute left-[-3.15rem] top-[-8.65rem] h-[20rem] w-[38rem] overflow-hidden">
        <Image
          src="/images/carebridge-logo.png"
          alt="CareBridge"
          width={1820}
          height={560}
          className="h-[21rem] w-auto max-w-none -translate-x-[1.15rem] -translate-y-[1.05rem] object-contain"
        />
      </div>
    </section>
  );
}
