const { chromium } = require("playwright"); const fs = require("fs");
const S = JSON.parse(fs.readFileSync("seed1.json")); const O = JSON.parse(fs.readFileSync("seed2.json"));
const WEB = "http://localhost:3100", API = "http://localhost:3999";
const call = async (m, path, token, body) => { const r = await fetch(API + path, { method: m, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
const sv = (n) => { const l = S.vets[n].login; return { va_sesion_veterinario: { accessToken: l.accessToken, refreshToken: l.refreshToken, accesoVenceEl: Date.now() + 3600e3, veterinarioId: l.veterinarioId, nombre: l.nombre, apellido: l.apellido, estado: l.estado, disponible: l.disponible, presencia: l.presencia, margenPorcentaje: 0, onboardingCompletado: true } }; };
const sc = (ob = true) => ({ va_sesion_cliente: { accessToken: S.cliente.accessToken, clienteId: S.cliente.clienteId, onboardingCompletado: ob } });
const sa = { va_sesion_admin: S.admin };
const log = []; const falla = (n, e) => { log.push(n + ": " + String(e).split("\n")[0]); console.log("FALLA", n, String(e).split("\n")[0]); };
(async () => {
  console.log("claves admin:", Object.keys(S.admin || {}));
  const b = await chromium.launch();
  const ctxs = {};
  const nuevo = async (st, w = 430, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await c.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, st || {}); const p = await c.newPage(); p.on("pageerror", (e) => console.log("JSERR", e.message.slice(0, 120))); return p; };
  const ir = async (p, ruta, espera = 900) => { await p.goto(WEB + ruta, { waitUntil: ruta.includes("panel-veterinario") ? "load" : "networkidle" }); await p.waitForTimeout(espera); };
  const foto = async (p, n) => { await p.waitForTimeout(300); await p.screenshot({ path: `shots/${n}.png`, fullPage: true }); console.log("ok", n); };
  const FILTRO = process.env.FILTRO ? new RegExp(process.env.FILTRO) : null;
  const { execFileSync } = require("child_process");
  const paso = async (n, fn) => { if (FILTRO && !FILTRO.test(n)) return; try { execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",`update "Veterinario" set "ultimaSenal"=now() where presencia in ('CONECTADO','STAND_BY')`]); await fn(); } catch (e) { falla(n, e); } };

  // ---------- 1. Páginas públicas (celular + laptop) ----------
  for (const [tam, w, h] of [["m", 430, 900], ["d", 1280, 800]]) {
    if (FILTRO && !FILTRO.test("publicas")) break;
    const p = await nuevo({}, w, h);
    for (const [n, r] of [["01-portada", "/"], ["02-quienes-somos", "/quienes-somos"], ["03-veterinarios", "/veterinarios"], ["04-contacto", "/contacto"], ["05-datos-legales", "/datos-legales"], ["06-terminos", "/terminos"], ["07-privacidad", "/privacidad"], ["08-convenio", "/convenio-veterinario"], ["09-404", "/esta-pagina-no-existe"]]) {
      await paso(n + tam, async () => { await ir(p, r); if (n === "01-portada") { const alto = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < alto; y += 400) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(120); } await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); } await foto(p, `${n}-${tam}`); });
    }
    await p.context().close();
  }

  // ---------- 2. Ingreso y registro ----------
  await paso("ingreso tutor", async () => {
    const p = await nuevo({}); await ir(p, "/ingresar"); await foto(p, "10-ingresar-tutor-m");
    await p.locator("input").first().fill("+5493415551234"); await p.getByRole("button", { name: /Recibir código/ }).click(); await p.waitForTimeout(1500); await foto(p, "10b-ingresar-codigo-m");
    await p.context().close();
  });
  await paso("ingreso vet error", async () => {
    const p = await nuevo({}); await ir(p, "/ingresar-veterinario"); await foto(p, "11-ingresar-vet-m");
    await p.locator('input[type="email"]').fill("ana@vet.test"); await p.locator('input[type="password"]').fill("incorrecta1"); await p.getByRole("button", { name: /Ingresar/ }).first().click(); await p.waitForTimeout(1800); await foto(p, "11b-ingresar-vet-error-m");
    await p.context().close();
  });
  await paso("registro vet", async () => {
    const p = await nuevo({}); await ir(p, "/registrar-veterinario"); await foto(p, "12-registro-vacio-m");
    const campos = ["Nombre", "Apellido", "Email", "DNI o número de documento", "Número de matrícula", "Colegio / jurisdicción", "Aseguradora", "Número de póliza"];
    const vals = ["Caro", "Benítez", `caro${Date.now()}@vet.test`, "30222333", "MP 4321", "Colegio de Médicos Veterinarios de Santa Fe", "Seguros Rivadavia", "POL-5521"];
    // La etiqueta puede llevar un mensaje de error adentro: se busca por el texto exacto del rótulo.
    const campo = (et) => p.locator("label", { has: p.locator("span", { hasText: new RegExp("^" + et + "$") }) }).locator("input").first();
    for (let i = 0; i < campos.length; i++) await campo(campos[i]).fill(vals[i]);
    await campo("Contraseña").fill("abcdefgh1"); await campo("Confirmar contraseña").fill("abcdefgh1");
    await campo("Vencimiento de la matrícula").fill("2030-01-01"); await campo("Vencimiento del seguro").fill("2030-06-30");
    const imgDoc = require("path").join(__dirname, "..", "fixtures", "foto.jpg");
    for (const et of ["DNI o pasaporte (frente)", "Título habilitante"]) await p.locator(`input[type=file][aria-label="${et}"]`).setInputFiles(imgDoc);
    await p.locator('input[type=file][aria-label^="Carnet"]').setInputFiles(imgDoc); await p.waitForTimeout(800);
    await p.setInputFiles("#reg-foto-archivo", require("path").join(__dirname, "..", "fixtures", "foto.jpg")); await p.waitForTimeout(800); await foto(p, "12e-registro-foto-m");
    await p.getByText("Perros", { exact: true }).click(); await p.getByText("Gatos", { exact: true }).click(); await p.getByText("Reptiles", { exact: true }).click(); await p.getByText("Peces", { exact: true }).click();
    await p.getByRole("heading", { name: /Qué especies atendés|especies atendés/ }).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await foto(p, "12d-registro-especies-m");
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(300);
    await foto(p, "12b-registro-completo-sin-tildar-m");
    await p.locator('input[type="checkbox"]').last().check(); await p.waitForTimeout(200); await foto(p, "12c-registro-completo-tildado-m");
    await p.getByRole("button", { name: /Crear mi cuenta/ }).click(); await p.waitForTimeout(3500);
    console.log("tras registro:", p.url().replace(WEB, "")); await foto(p, "13-vet-bienvenida-1-m");
    for (const k of [2, 3]) { await p.getByRole("button", { name: /Siguiente/ }).click().catch(() => {}); await p.waitForTimeout(500); await foto(p, `13-vet-bienvenida-${k}-m`); }
    await p.getByRole("button", { name: /Ir a mi panel/ }).click(); await p.waitForTimeout(2000); await foto(p, "14-vet-panel-recien-registrado-m");
    await p.context().close();
  });
  await paso("ingreso admin", async () => {
    const p = await nuevo({}); await ir(p, "/admin/ingresar"); await foto(p, "15-admin-ingresar-m");
    await p.locator('input[type="email"]').fill("admin@videollamadaanimal.test"); await p.locator('input[type="password"]').fill("mala"); await p.getByRole("button").first().click(); await p.waitForTimeout(1500); await foto(p, "15b-admin-error-m");
    await p.context().close();
  });

  // ---------- 3. Tutor ----------
  await paso("tutor bienvenida", async () => {
    const p = await nuevo(sc(false)); await ir(p, "/panel"); await foto(p, "20-tutor-bienvenida-1-m");
    for (const k of [2, 3]) { await p.getByRole("button", { name: /Siguiente/ }).click(); await p.waitForTimeout(500); await foto(p, `20-tutor-bienvenida-${k}-m`); }
    await p.context().close();
  });
  await paso("tutor panel", async () => {
    for (const [t, w, h] of [["m", 430, 900], ["d", 1280, 800]]) { const p = await nuevo(sc(), w, h); await ir(p, "/panel"); await foto(p, `21-tutor-panel-${t}`); await p.context().close(); }
  });
  await paso("tutor intake", async () => {
    const p = await nuevo(sc()); await ir(p, "/intake"); await foto(p, "22-intake-m");
    await p.locator('input[type="checkbox"]').first().check(); await p.waitForTimeout(600); await foto(p, "22b-intake-bandera-roja-m");
    await p.locator('input[type="checkbox"]').first().uncheck();
    await p.locator("select").selectOption("perro"); await p.locator("textarea").fill("Está decaído y no quiere comer desde ayer"); await foto(p, "22c-intake-completo-m");
    await p.getByRole("button", { name: "Ver veterinarios disponibles" }).click(); await p.waitForTimeout(3000); console.log("tras intake:", p.url().replace(WEB, "")); await foto(p, "23-elegir-lista-m");
    await p.context().close();
  });
  await paso("tutor elegir desktop", async () => { const p = await nuevo(sc(), 1280, 800); await ir(p, `/elegir-veterinario/${O.elegir}`, 1500); await foto(p, "23-elegir-lista-d"); await p.context().close(); });
  await paso("tutor emergencia", async () => { const p = await nuevo(sc()); await ir(p, `/elegir-veterinario/${O.emergencia}`, 1500); await foto(p, "24-elegir-emergencia-m"); await p.context().close(); });
  await paso("tutor sin colegas para la especie", async () => {
    const k = await call("POST", "/casos", S.cliente.accessToken, { banderas: { dificultadRespiratoria:false, inconsciente:false, sangradoActivo:false, sospechaIngestaToxico:false, convulsionEnCurso:false, noPuedeParseCaminar:false, distensionAbdominal:false, traumatismoMayor:false }, contexto: { especie: "cerdo", motivoConsulta: "Cojea del miembro posterior" } });
    const p = await nuevo(sc()); await ir(p, `/elegir-veterinario/${k.j.id}`, 1800); await foto(p, "24b-elegir-sin-colegas-m"); await p.context().close();
  });
  await paso("tutor elegir→espera", async () => {
    const p = await nuevo(sc()); await ir(p, `/elegir-veterinario/${O.elegir}`, 1500);
    await p.locator('input[type="checkbox"]').first().check(); await p.waitForTimeout(300); await foto(p, "25-elegir-aceptando-m");
    await p.getByRole("button", { name: /^Elegir$|Elegir/ }).first().click(); await p.waitForTimeout(2500); await foto(p, "26-esperando-m");
    // el veterinario acepta
    const sol = (await call("GET", `/solicitudes/pendiente`, S.vets["Ana"].login.accessToken)).j || (await call("GET", `/solicitudes/pendiente`, S.vets["Luis"].login.accessToken)).j;
    console.log("solicitud en cola:", sol && sol.id);
    await p.context().close();
  });
  await paso("tutor pactado", async () => { const p = await nuevo(sc()); await ir(p, "/panel"); await foto(p, "27-turno-propuesto-panel-m"); await ir(p, `/elegir-veterinario/${O.postergado}`, 1500); await foto(p, "27b-turno-propuesto-m"); await p.context().close(); });
  await paso("tutor aceptada", async () => { const p = await nuevo(sc()); await ir(p, `/elegir-veterinario/${O.asignado}`, 2000); await foto(p, "28-aceptada-pago-m"); await p.context().close(); });
  for (const [e, n] of [["exito", "29-pago-exito"], ["pendiente", "29-pago-pendiente"], ["fallo", "29-pago-fallo"]])
    await paso(n, async () => { const p = await nuevo(sc()); await ir(p, `/pago/${e}?casoId=${O.asignado}`, 1500); await foto(p, n + "-m"); await p.context().close(); });
  await paso("consulta aviso", async () => { const p = await nuevo(sc()); await ir(p, `/consulta/${O.asignado}`, 1800); await foto(p, "30-consulta-aviso-m"); await p.context().close(); });
  await paso("calificar", async () => {
    const p = await nuevo(sc()); await ir(p, `/calificar/${O.cerrado}`, 1200); await foto(p, "31-calificar-m");
    await p.getByRole("button", { name: /5/ }).first().click().catch(() => {}); await p.waitForTimeout(400); await foto(p, "31b-calificar-estrellas-m");
    await p.context().close();
  });
  await paso("reportar", async () => { const p = await nuevo(sc()); await ir(p, `/reportar-problema/${O.cerrado2}`, 1200); await foto(p, "32-reportar-m"); await p.context().close(); });

  // ---------- 4. Veterinario ----------
  await paso("vet sheet", async () => {
    // solicitud fresca a Ana
    const k = await call("POST", "/casos", S.cliente.accessToken, { banderas: { dificultadRespiratoria:false, inconsciente:false, sangradoActivo:false, sospechaIngestaToxico:false, convulsionEnCurso:false, noPuedeParseCaminar:false, distensionAbdominal:false, traumatismoMayor:false }, contexto: { especie: "Perro", raza: "Caniche", motivoConsulta: "Tose por las noches desde hace dos días" } });
    const p = await nuevo(sv("Ana")); await ir(p, "/panel-veterinario", 1200); await foto(p, "40-vet-panel-conectado-m");
    await call("POST", `/solicitudes/caso/${k.j.id}`, S.cliente.accessToken, { veterinarioId: S.vets["Ana"].id, aceptoTerminos: true });
    await p.waitForTimeout(5000); await foto(p, "41-vet-nueva-consulta-m");
    await p.getByRole("button", { name: /Postergar/ }).click(); await p.waitForTimeout(400); await foto(p, "41b-vet-postergar-m");
    await p.getByRole("button", { name: "Volver" }).click(); await p.getByRole("button", { name: /^Aceptar$/ }).click(); await p.waitForTimeout(2500); await foto(p, "42-vet-tras-aceptar-m");
    await p.context().close();
    const pd = await nuevo(sv("Ana"), 1280, 800); await ir(pd, "/panel-veterinario", 1500); await foto(pd, "40-vet-panel-d"); await pd.context().close();
  });
  await paso("vet standby/desconectado", async () => { for (const [n, nom] of [["43-vet-standby-m", "Sofía"], ["44-vet-desconectado-m", "Diego"]]) { const p = await nuevo(sv(nom)); await ir(p, "/panel-veterinario", 1500); await foto(p, n); await p.context().close(); } });
  await paso("vet sin cobro", async () => {
    const p = await nuevo({}); await ir(p, "/ingresar-veterinario"); await p.locator('input[type="email"]').fill("tomas@vet.test"); await p.locator('input[type="password"]').fill("abcdefgh1"); await p.getByRole("button", { name: /Ingresar/ }).first().click(); await p.waitForTimeout(3500);
    console.log("tomás ->", p.url().replace(WEB, "")); await foto(p, "45-vet-sin-cobro-m"); await p.context().close();
  });
  await paso("vet pendiente/suspendida", async () => { for (const [n, mail] of [["46-vet-pendiente-m", "martin@vet.test"], ["46b-vet-suspendida-m", "lucia@vet.test"]]) { const p = await nuevo({}); await ir(p, "/ingresar-veterinario"); await p.locator('input[type="email"]').fill(mail); await p.locator('input[type="password"]').fill("abcdefgh1"); await p.getByRole("button", { name: /Ingresar/ }).first().click(); await p.waitForTimeout(3500); await foto(p, n); await p.context().close(); } });
  await paso("vet cobros", async () => { const p = await nuevo(sv("Luis")); await ir(p, "/veterinario/cobros", 1200); await foto(p, "47-vet-cobros-m"); await p.context().close(); });
  await paso("vet precios", async () => { const p = await nuevo(sv("Luis")); await ir(p, "/panel-veterinario", 1800); await foto(p, "48-vet-precios-m"); await p.context().close(); });

  // ---------- 4b. Ayuda, marca y contacto (2026-11-03) ----------
  await paso("ayuda tutor", async () => {
    for (const [t, w, h] of [["m", 430, 900], ["d", 1280, 800]]) {
      const p = await nuevo(sc(), w, h); await ir(p, "/ayuda", 1200);
      await p.locator("details summary").nth(1).click(); await p.waitForTimeout(150);
      await foto(p, `60-ayuda-tutor-${t}`);
      if (t === "m") {
        await p.locator("#pregunta-ayuda").fill("¿Puedo cambiar de veterinario después de pagar?");
        await p.getByRole("button", { name: /Enviar pregunta/ }).click(); await p.waitForTimeout(1200);
        await foto(p, "61-ayuda-tutor-enviada-m");
      }
      await p.context().close();
    }
  });
  await paso("ayuda tutor sin sesion", async () => { const p = await nuevo({}); await ir(p, "/ayuda", 1000); await p.locator("#nueva").scrollIntoViewIfNeeded(); await foto(p, "62-ayuda-sin-sesion-m"); await p.context().close(); });
  await paso("ayuda vet", async () => {
    for (const [t, w, h] of [["m", 430, 900], ["d", 1280, 800]]) {
      const p = await nuevo(sv("Luis"), w, h); await ir(p, "/veterinario/ayuda", 1200);
      await p.locator("details summary").nth(2).click(); await p.waitForTimeout(150);
      await foto(p, `63-ayuda-vet-${t}`);
      if (t === "m") {
        await p.locator("#pregunta-ayuda").fill("¿Cómo cambio el email de mi cuenta de PayPal?");
        await p.getByRole("button", { name: /Enviar pregunta/ }).click(); await p.waitForTimeout(1200);
        await foto(p, "64-ayuda-vet-enviada-m");
      }
      await p.context().close();
    }
  });
  await paso("botón ayuda en barras", async () => {
    for (const [n, st, ruta] of [["65-boton-ayuda-panel-tutor", sc(), "/panel"], ["66-boton-ayuda-intake", sc(), "/intake"], ["67-boton-ayuda-panel-vet", sv("Luis"), "/panel-veterinario"], ["68-boton-ayuda-cobros", sv("Luis"), "/veterinario/cobros"], ["69-boton-ayuda-registro", {}, "/registrar-veterinario"]]) {
      for (const [t, w] of [["360", 360], ["d", 1280]]) { const p = await nuevo(st, w, 800); await ir(p, ruta, 1400); await p.screenshot({ path: `shots/${n}-${t}.png`, clip: { x: 0, y: 0, width: w, height: 160 } }); console.log("ok", n, t); await p.context().close(); }
    }
  });
  await paso("marca quienes somos", async () => {
    for (const w of [320, 360, 390, 430, 1280]) { const p = await nuevo({}, w, 700); await ir(p, "/quienes-somos", 800); const ov = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); console.log("quienes-somos", w, "desborda:", ov); await p.screenshot({ path: `shots/70-quienes-somos-header-${w}.png`, clip: { x: 0, y: 0, width: w, height: 110 } }); await p.context().close(); }
  });
  await paso("contacto con email", async () => {
    const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]);
    q(`update "ConfiguracionPlataforma" set "emailContacto"='contacto@ejemplo.test'`);
    const p = await nuevo({}); await ir(p, "/contacto", 1200); await foto(p, "71-contacto-con-email-m"); await p.context().close();
    q(`update "ConfiguracionPlataforma" set "emailContacto"=NULL`);
  });

  // ---------- 5. Administrador ----------
  await paso("admin", async () => {
    for (const [t, w, h] of [["m", 430, 900], ["d", 1280, 800]]) { const p = await nuevo(sa, w, h); await ir(p, "/admin", 1800); await foto(p, `50-admin-${t}`); await ir(p, "/admin/precios", 1500); await foto(p, `51-admin-precios-${t}`); await ir(p, "/admin/tarifas", 1500); await foto(p, `52-admin-tarifas-${t}`); await p.context().close(); }
  });
  await b.close(); console.log("FALLAS:", log.length ? log : "ninguna");
})().catch((e) => { console.error(e); process.exit(1); });
