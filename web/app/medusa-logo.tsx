import Image from "next/image";

// Logo da Medusa (pixel art do dono, em web/public/logo.png).
// Mantem a API `size` pra os call sites (nav, sidebar, login) nao mudarem.
export function MedusaLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Medusa Cut"
      width={size}
      height={size}
      priority
      style={{ imageRendering: "pixelated", display: "block" }}
    />
  );
}
