// Botón "Volver" en TODAS las vistas (menos la portada) y logo del encabezado -> portada.
// Necesita el simulacro levantado y sembrado (rehacer.sh) y correr desde tests/simulacro/sim.
// Uso: cd tests/simulacro/sim && NODE_PATH=/opt/npm-tools/node_modules node ../api/test-volver.js
const { chromium } = require("playwright"); const fs = require("fs");
const S = JSON.parse(fs.readFileSync("seed1.json")), O = JSON.parse(fs.readFileSync("seed2.json"));
const WEB = "http://localhost:3100";
const sv = (n) => { const l = S.vets[n].login; return { va_sesion_veterinario: { accessToken: l.accessToken, refreshToken: l.refreshToken, accesoVenceEl: Date.now() + 3600e3, veterinarioId: l.veterinarioId, nombre: l.nombre, apellido: l.apellido, estado: l.estado, disponible: l.disponible, presencia: l.presencia, margenPorcentaje: 0, onboardingCompletado: true } }; };
const sc = (ob = true) => ({ va_sesion_cliente: { accessToken: S.cliente.accessToken, clienteId: S.cliente.clienteId, onboardingCompletado: ob } });
const sa = { va_sesion_admin: S.admin };
let f = 0; const ok = (c, t) => { console.log((c ? "OK   " : "FALLA") + " " + t); if (!c) f++; };
const errs = [];
(async () => {
  const b = await chromium.launch();
  const nuevo = async (st) => { const c = await b.newContext({ viewport: { width: 400, height: 850 } }); await c.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, st || {}); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(e.message.slice(0, 100))); return p; };
  const ir = async (p, r) => { await p.goto(WEB + r, { waitUntil: "load" }); await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(1200); };
  const hayVolver = async (p) => p.locator('[aria-label="Volver"]').first().isVisible().catch(() => false);
  const no404 = async (p) => !(await p.getByText("No encontramos esa página").isVisible().catch(() => false));

  // sesión -> rutas. "destino" = a dónde debe llevar la flecha (null = no se verifica el destino exacto)
  const casos = [
    ["público", {}, [["/quienes-somos", "/"], ["/veterinarios", "/"], ["/contacto", "/"], ["/datos-legales", "/"], ["/terminos", "/"], ["/privacidad", "/"], ["/convenio-veterinario", "/registrar-veterinario"], ["/ingresar", "/"], ["/ingresar-veterinario", "/"], ["/registrar-veterinario", "/ingresar-veterinario"], ["/recuperar-contrasena", "/ingresar-veterinario"], ["/recuperar-usuario", "/ingresar-veterinario"], ["/restablecer-contrasena", "/ingresar-veterinario"], ["/admin/ingresar", "/"], ["/ayuda", "/"], ["/veterinario/ayuda", "/ingresar-veterinario"], ["/esta-no-existe", "/"]]],
    ["tutor", sc(), [["/panel", "/"], ["/intake", "/panel"], ["/ayuda", "/panel"], ["/pago/exito", "/panel"], ["/pago/fallo", "/panel"], ["/elegir-veterinario/" + O.elegir, "/panel"], ["/elegir-veterinario/" + O.pendiente, "/panel"], ["/elegir-veterinario/" + O.asignado, "/panel"], ["/calificar/" + O.cerrado, "/panel"], ["/reportar-problema/" + O.cerrado, "/panel"], ["/consulta/" + O.asignado, null]]],
    ["veterinario", sv("Ana"), [["/panel-veterinario", "/"], ["/veterinario/cobros", "/panel-veterinario"], ["/veterinario/ayuda", "/panel-veterinario"]]],
    ["admin", sa, [["/admin", "/"], ["/admin/precios", "/admin"], ["/admin/tarifas", "/admin/precios"]]],
  ];
  for (const [quien, st, rutas] of casos) {
    const p = await nuevo(st);
    for (const [ruta, destino] of rutas) {
      const nombre = `${quien} ${ruta.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, ":id")}`;
      try {
        await ir(p, ruta);
        const v = await hayVolver(p);
        ok(v, `${nombre}: tiene botón Volver`);
        const logo = await p.locator('a[aria-label*="portada"]').first().isVisible().catch(() => false);
        ok(logo, `${nombre}: el logo del encabezado lleva a la portada`);
        if (v && destino) {
          const el = p.locator('[aria-label="Volver"]').first();
          const href = await el.getAttribute("href");
          ok(href === destino, `${nombre}: Volver -> ${destino} (${href})`);
        }
        ok(await no404(p) || ruta === "/esta-no-existe", `${nombre}: no es una página 404`);
      } catch (e) { ok(false, `${nombre}: ${String(e).split("\n")[0]}`); }
    }
    await p.context().close();
  }

  // La portada NO tiene volver
  let p = await nuevo({}); await ir(p, "/");
  ok(!(await hayVolver(p)), "portada: NO hay botón Volver");

  // Tocar el logo lleva a la portada (desde una pantalla con marco y desde "Quiénes somos")
  for (const r of ["/contacto", "/ingresar", "/quienes-somos"]) {
    await ir(p, r); await p.locator('a[aria-label*="portada"]').first().click(); await p.waitForURL(WEB + "/", { timeout: 5000 }).catch(() => {});
    ok(p.url() === WEB + "/", `logo de ${r} -> portada (${p.url()})`);
  }
  // Las flechas llevan a páginas que existen: seguir cada Volver de las públicas
  for (const r of ["/contacto", "/convenio-veterinario", "/recuperar-usuario", "/ingresar-veterinario", "/registrar-veterinario"]) {
    await ir(p, r); await p.locator('[aria-label="Volver"]').first().click(); await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(500);
    ok(await no404(p) && p.url() !== WEB + r, `seguir Volver desde ${r} -> ${p.url().replace(WEB, "")}`);
  }

  // Tutor: el paso del código vuelve al paso del teléfono; y de ahí a la portada
  await ir(p, "/ingresar");
  await p.fill('input[type=tel]', "+54 9 341 5550000" + Math.floor(Math.random() * 90 + 10)); await p.getByRole("button", { name: "Recibir código" }).click();
  await p.getByText("Te escribimos por WhatsApp").waitFor({ timeout: 8000 }).catch(() => {});
  ok(await p.getByText("Te escribimos por WhatsApp").isVisible(), "ingresar: pasó al paso del código");
  ok(await hayVolver(p), "ingresar (paso del código): hay botón Volver");
  await p.locator('[aria-label="Volver"]').first().click(); await p.waitForTimeout(400);
  ok(await p.getByText("Ingresá tu teléfono").isVisible(), "ingresar: Volver del código -> vuelve al paso del teléfono");
  ok(await p.locator('[aria-label="Volver"]').first().getAttribute("href") === "/", "ingresar (teléfono): Volver -> portada");
  await p.context().close();

  // Bienvenida (primer ingreso): paso 2 vuelve al paso 1; paso 1 lleva a la portada
  p = await nuevo(sc(false)); await ir(p, "/panel");
  ok(await p.getByRole("dialog", { name: "Bienvenida" }).isVisible().catch(() => false), "bienvenida del tutor visible");
  ok(await hayVolver(p), "bienvenida: hay botón Volver");
  await p.getByRole("button", { name: "Siguiente" }).click(); await p.waitForTimeout(300);
  await p.locator('[aria-label="Volver"]').first().click(); await p.waitForTimeout(300);
  ok(await p.getByText("Hola. Acá siempre hay alguien.").isVisible(), "bienvenida: Volver del paso 2 -> paso 1");
  ok(await p.locator('[aria-label="Volver"]').first().getAttribute("href") === "/", "bienvenida (paso 1): Volver -> portada");
  await p.context().close();
  const sin = { ...sv("Ana") }; sin.va_sesion_veterinario = { ...sin.va_sesion_veterinario, onboardingCompletado: false };
  p = await nuevo(sin); await ir(p, "/panel-veterinario");
  ok(await hayVolver(p), "bienvenida del veterinario: hay botón Volver");
  await p.context().close();

  ok(errs.length === 0, "sin errores de JavaScript en ninguna pantalla" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
  await b.close(); console.log(f ? "FALLAS: " + f : "TODO OK"); process.exit(f ? 1 : 0);
})();
