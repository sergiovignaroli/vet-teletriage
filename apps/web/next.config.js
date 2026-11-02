/** @type {import('next').NextConfig} */

// Cabeceras de seguridad (Fase "seguridad-base").
//
// - Permissions-Policy: la cámara y el micrófono se permiten SOLO para este
//   mismo sitio (hacen falta para la videollamada); ubicación, pagos del
//   navegador y demás sensores quedan apagados.
// - Content-Security-Policy en modo "Report-Only": el navegador NO bloquea
//   nada, solo anota en la consola lo que bloquearía. Se activa de verdad
//   (cambiando el nombre de la cabecera) cuando se confirme, mirando una
//   semana de uso real, que no queda afuera ninguna pieza legítima (video
//   de Agora, Mercado Pago, PayPal, tipografías). Activarla a ciegas podría
//   romper el pago o la videollamada.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.mercadopago.com.ar https://www.paypal.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig = {
  transpilePackages: ["@vet-teletriage/types"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
