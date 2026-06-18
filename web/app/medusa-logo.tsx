import Image from "next/image";

// Logo da Medusa Clip (pixel art do dono, em web/public/logo.png).
// Mantem a API `size` pra os call sites (nav, sidebar, login) nao mudarem.
export function MedusaLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Medusa Clip"
      width={size}
      height={size}
      priority
      style={{ imageRendering: "pixelated", display: "block" }}
    />
  );
}
