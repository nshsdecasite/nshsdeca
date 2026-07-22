import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({ className = "h-10 w-auto", priority = false }: LogoProps) {
  return (
    <Image
      src="/images/nshsdecanobg.png"
      alt="Newman Smith DECA"
      width={220}
      height={48}
      priority={priority}
      className={`${className} object-contain object-left`}
    />
  );
}

export function LogoLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-10 items-center rounded-lg px-1 transition-transform active:scale-[0.96]"
    >
      <Logo className={className ?? "h-10 w-auto sm:h-11"} priority />
    </Link>
  );
}
