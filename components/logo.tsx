import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({ className = "h-[2.125rem] w-auto", priority = false }: LogoProps) {
  return (
    <Image
      src="/images/nshsdecanobg.png"
      alt="Newman Smith DECA"
      width={930}
      height={283}
      sizes="180px"
      priority={priority}
      className={`${className} no-outline object-contain object-left outline-none`}
    />
  );
}

export function LogoLink({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center rounded-lg px-1 transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      <Logo className={className ?? "h-[2.125rem] w-auto sm:h-[2.3375rem]"} priority />
    </Link>
  );
}
