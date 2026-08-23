import Image from "next/image";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span className={`relative inline-block h-10 w-10 overflow-hidden rounded-xl ${className}`}>
      <Image
        src="/brand/youtube-mark.png"
        alt=""
        fill
        sizes="40px"
        className="object-cover"
        priority
      />
    </span>
  );
}
