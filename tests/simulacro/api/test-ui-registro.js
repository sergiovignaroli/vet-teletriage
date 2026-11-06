// Registro de veterinarios en el navegador: campos faltantes en rojo, seguro opcional,
// subida de documentos y cómo los ve el administrador.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const WEB = "http://localhost:3100";
const DOCS = process.env.DOCS_DIR;
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
let f = 0; const ok = (c, t) => { console.log((c ? "OK   " : "FALLA") + " " + t); if (!c) f++; };
const EMAIL = "uireg@v.test";
(async () => {
  q(`delete from "Veterinario" where email='${EMAIL}'`);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errores = []; p.on("pageerror", (e) => errores.push(e.message));
  const campo = (et) => p.locator("label", { has: p.locator("span", { hasText: new RegExp("^" + et + "$") }) }).locator("input").first();
  await p.goto(WEB + "/registrar-veterinario"); await p.waitForTimeout(800);

  // 1. Seguro opcional y sin "obligatorio" en rojo antes de tocar el botón
  ok(await p.getByText("Seguro de responsabilidad civil (opcional)").isVisible(), "el seguro figura como opcional");
  ok((await p.locator('[aria-invalid="true"]').count()) === 0, "antes de apretar el botón no hay nada en rojo");
  const boton = p.getByRole("button", { name: "Crear mi cuenta" });
  ok(await boton.isEnabled(), "el botón está habilitado (no queda apagado sin explicar)");

  // 2. Apretar con todo vacío: se marcan los que faltan
  await boton.click(); await p.waitForTimeout(700);
  const rojos = await p.locator('input[aria-invalid="true"]').count();
  ok(rojos >= 8, "con todo vacío se marcan en rojo los campos de texto obligatorios (" + rojos + ")");
  ok((await p.locator(".va-doc-error").count()) === 3, "se marcan los 3 documentos obligatorios (el dorso y el seguro NO)");
  ok(await p.getByText("Marcá al menos una especie").isVisible(), "falta de especie: mensaje en rojo");
  ok(await p.getByText("tenés que aceptar el convenio").isVisible(), "falta aceptar el convenio: mensaje en rojo");
  ok(await p.getByText("Revisá los campos marcados en rojo").isVisible(), "mensaje general junto al botón");
  const rojo = await p.locator('input[aria-invalid="true"]').first().evaluate((e) => getComputedStyle(e).borderColor);
  ok(rojo === "rgb(198, 40, 40)", "el borde es rojo (" + rojo + ")");
  const sinSeguro = await p.getByText("Falta la aseguradora").count();
  ok(sinSeguro === 0, "los campos de seguro vacíos NO se marcan");
  const enPantalla = await p.locator('input[aria-invalid="true"]').first().evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  ok(enPantalla, "la pantalla se lleva al primer campo que falta");
  await p.screenshot({ path: __dirname + "/../sim/shots/registro-errores-m.png", fullPage: true });

  // 3. Llenar de a poco: el rojo se va cuando se completa
  await campo("Nombre").fill("Ui");
  ok(await p.getByText("Escribí tu nombre").count() === 0, "al completar el nombre desaparece su error");
  await campo("Apellido").fill("Registro");
  await campo("Email").fill("mal-email");
  await campo("DNI o número de documento").fill("30111222");
  const pw = p.locator('input[autocomplete=new-password]');
  await pw.nth(0).fill("corta"); await pw.nth(1).fill("corta");
  await boton.click(); await p.waitForTimeout(300);
  ok(await p.getByText("Revisá el email").isVisible(), "email mal escrito: mensaje");
  ok(await p.getByText("al menos 8 caracteres").isVisible(), "contraseña corta: mensaje");
  await campo("Email").fill(EMAIL);
  await pw.nth(0).fill("claveSegura1"); await pw.nth(1).fill("otraDistinta1");
  ok(await p.getByText("Las contraseñas no coinciden").isVisible(), "contraseñas distintas: mensaje");
  await pw.nth(1).fill("claveSegura1");
  await campo("Número de matrícula").fill("MP 4321");
  await campo("Colegio / jurisdicción").fill("Colegio de Santa Fe");
  await campo("Vencimiento de la matrícula").fill("2020-01-01");
  await boton.click(); await p.waitForTimeout(300);
  ok(await p.getByText("ya pasó").isVisible(), "matrícula vencida: mensaje");
  await campo("Vencimiento de la matrícula").fill("2030-06-30");

  // 4. Seguro a medias
  await campo("Aseguradora").fill("Seguros Rivadavia");
  await boton.click(); await p.waitForTimeout(300);
  ok(await p.getByText("Falta el número de póliza").isVisible() && await p.getByText("Falta el vencimiento").isVisible(), "seguro a medias: marca lo que falta");
  await campo("Aseguradora").fill("");
  ok(await p.getByText("Falta el número de póliza").count() === 0, "si lo vacía de nuevo, el seguro vuelve a ser opcional");

  // 5. Documentos, especies y convenio
  const inputs = p.locator('input[type=file][aria-label]');
  const n = await inputs.count();
  ok(n === 4, "hay 4 lugares para subir documentos (" + n + ")");
  await p.locator('input[type=file][aria-label="DNI o pasaporte (frente)"]').setInputFiles(DOCS + "/dni.jpg");
  await p.locator('input[type=file][aria-label="Título habilitante"]').setInputFiles(DOCS + "/titulo.jpg");
  await p.waitForTimeout(1500);
  const miniaturas = await p.locator(".va-doc-miniatura img").count();
  ok(miniaturas === 2, "aparecen las miniaturas de lo subido (" + miniaturas + ")");
  const tamano = await p.locator(".va-doc-miniatura img").first().evaluate((i) => i.src.length);
  ok(tamano < 1_200_000, "la imagen se reduce en el navegador (" + Math.round(tamano / 1024) + " KB desde 4.5 MB)");
  await p.getByText("Marcar todas").first().click();
  await boton.click(); await p.waitForTimeout(500);
  ok((await p.locator(".va-doc-error").count()) === 1 && await p.getByText("Falta la foto de tu carnet o certificado").isVisible(), "solo queda en rojo el documento que falta");
  await p.locator('input[type=file][aria-label^="Carnet"]').setInputFiles(DOCS + "/carnet.jpg");
  await p.waitForTimeout(1200);
  await p.locator('input[type=checkbox]').last().check();
  await p.screenshot({ path: __dirname + "/../sim/shots/registro-completo-m.png", fullPage: true });

  // 6. Enviar
  await boton.click();
  await p.waitForURL("**/panel-veterinario", { timeout: 20000 }).catch(() => {});
  if (!p.url().includes("/panel-veterinario")) console.log("   alertas visibles:", JSON.stringify(await p.locator(".va-error-texto").allInnerTexts()));
  ok(p.url().includes("/panel-veterinario"), "la cuenta se crea y pasa al panel (" + p.url().replace(WEB, "") + ")");
  await p.waitForTimeout(1500);
  ok(q(`select count(*) from "DocumentoVeterinario" d join "Veterinario" v on v.id=d."veterinarioId" where v.email='${EMAIL}'`) === "3", "quedaron guardados los 3 documentos");
  ok(q(`select "seguroAseguradora" is null from "Veterinario" where email='${EMAIL}'`) === "t", "sin seguro cargado");
  ok(await p.getByText("Falta tu documentación").count() === 0, "en el panel no aparece el aviso de documentación (no falta nada)");

  // 7. Aviso en el panel si falta algo
  q(`delete from "DocumentoVeterinario" where tipo='TITULO' and "veterinarioId" in (select id from "Veterinario" where email='${EMAIL}')`);
  await p.reload(); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: "Saltar" }).click().catch(() => {}); await p.waitForTimeout(1500);
  ok(await p.getByText("Falta tu documentación").isVisible() && await p.getByText("Título habilitante").first().isVisible(), "si falta un documento, el panel lo pide");
  await p.locator('input[type=file][aria-label="Título habilitante"]').setInputFiles(DOCS + "/titulo.jpg");
  await p.waitForTimeout(2500);
  ok(await p.getByText("Falta tu documentación").count() === 0, "al subirlo desde el panel, el aviso desaparece");
  await p.screenshot({ path: __dirname + "/../sim/shots/registro-panel-m.png" });

  ok(errores.length === 0, "sin errores de JavaScript" + (errores.length ? ": " + errores[0] : ""));
  q(`delete from "Veterinario" where email='${EMAIL}'`);
  await b.close();
  console.log(f ? `\n${f} FALLA(S)` : "\nTODO OK");
  process.exit(f ? 1 : 0);
})();
