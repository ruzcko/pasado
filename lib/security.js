// Security headers for responses the Functions build. site/_headers only covers static files,
// so every HTML page a Function returns goes through secure(). Keep this list in step with the /* block there.
// The CSP is Report-Only until it has been checked in a browser. The two hashes are the inline scripts in
// index.html (theme) and 404.html / credits.html; recompute them if those scripts change.
export const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Content-Security-Policy-Report-Only": "default-src 'self'; script-src 'self' 'sha256-pMXYxm4ozIoHFw81mg29GuaA3pYVGsOb+60omF2JUPs=' 'sha256-zsPi8O1SJV7PCRDjV0outx6WoXFnVNYhWdZP1JJh+PA='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

export function secure(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
  return out;
}
