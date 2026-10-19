import Image from "next/image";
import logo1 from "./assets/logo1.png";
import logo2 from "./assets/logo2.png";

type BrandLogoProps = {
  variant?: "signature" | "symbol";
  className?: string;
  priority?: boolean;
};

/**
 * signature: logo1 — símbolo, nome e assinatura completos.
 * symbol: logo2 — apenas o símbolo, para espaços compactos.
 *
 * As imagens ficam em app/assets; por isso usamos import estático,
 * não uma URL /assets (essa URL só funcionaria na pasta public).
 */
export default function BrandLogo({
  variant = "symbol",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const signature = variant === "signature";
  return (
    <Image
      src={signature ? logo1 : logo2}
      alt={signature ? "Thiago de Alcântara — Consultoria" : "Símbolo de Thiago de Alcântara"}
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      priority={priority}
      sizes={signature ? "(max-width: 480px) 180px, 260px" : "72px"}
    />
  );
}
