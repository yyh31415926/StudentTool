import Image from "next/image";

/** Decorative character, intentionally static and non-interactive. */
export function Mascot() {
  return <Image
    src="/hero-character.png"
    alt=""
    width={1254}
    height={1254}
    sizes="208px"
    className="mascot"
    priority
  />;
}

