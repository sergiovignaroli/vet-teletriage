// Registro de veterinarios: seguro opcional, contraseña mínima, documentos (API) — contra el simulacro (API 3999).
// Repetible: borra sus propios veterinarios al empezar y al terminar.
const { execFileSync } = require("child_process");
const API = "http://localhost:3999";
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
const call = async (m, p, t, b, h) => { const r = await fetch(API + p, { method: m, headers: { "content-type": "application/json", ...(t ? { authorization: "Bearer " + t } : {}), ...(h || {}) }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
let f = 0; const ok = (c, t) => { console.log((c ? "OK   " : "FALLA") + " " + t); if (!c) f++; };
const MAILS = ["sinseguro@v.test", "conseguro@v.test", "parcial@v.test", "corta@v.test"];
const limpiar = () => q(`delete from "Veterinario" where email in (${MAILS.map((m) => `'${m}'`).join(",")})`);
const base = (email, extra) => ({ nombre: "Sin", apellido: "Seguro", email, password: "claveSegura1", dniONumero: "30111222", matriculaNumero: "MP 55", matriculaColegio: "C", matriculaVenceEl: "2030-01-01", aceptoConvenio: true, especiesAtiende: ["perro"], ...extra });
// JPEG mínimo válido (firma FF D8 FF) rellenado hasta el tamaño pedido: solo se valida firma y peso.
const jpeg = (bytes) => "data:image/jpeg;base64," + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(bytes, 7)]).toString("base64");

(async () => {
  limpiar();
  // 1. Seguro opcional
  const r1 = await call("POST", "/auth/veterinario/registrar", null, base("sinseguro@v.test"));
  ok(r1.s === 201 && r1.j?.accessToken, "registro SIN seguro: se crea la cuenta (" + r1.s + ")");
  ok(q(`select "seguroAseguradora" is null and "seguroVenceEl" is null from "Veterinario" where email='sinseguro@v.test'`) === "t", "sin seguro: los datos del seguro quedan vacíos");
  const r2 = await call("POST", "/auth/veterinario/registrar", null, base("conseguro@v.test", { seguroAseguradora: "Rivadavia", seguroPoliza: "P1", seguroVenceEl: "2030-02-02" }));
  ok(r2.s === 201 && q(`select "seguroAseguradora" from "Veterinario" where email='conseguro@v.test'`) === "Rivadavia", "registro CON seguro: se guarda");
  const r3 = await call("POST", "/auth/veterinario/registrar", null, base("parcial@v.test", { seguroAseguradora: "Solo aseguradora" }));
  ok(r3.s === 400 && /seguro/i.test(r3.j?.message || ""), "seguro a medias (solo aseguradora): 400 con mensaje (" + r3.s + ")");
  // 2. Matrícula sigue siendo obligatoria
  const r4 = await call("POST", "/auth/veterinario/registrar", null, base("parcial@v.test", { matriculaVenceEl: "no-es-fecha" }));
  ok(r4.s === 400, "fecha de matrícula inválida: 400 (" + r4.s + ")");
  // 3. Contraseña mínima
  const r5 = await call("POST", "/auth/veterinario/registrar", null, base("corta@v.test", { password: "corta" }));
  ok(r5.s === 400 && /contraseña/i.test(r5.j?.message || ""), "contraseña de 5 caracteres: 400 (" + r5.s + ")");

  // 4. Documentos
  const t = r1.j.accessToken;
  let m = await call("GET", "/veterinarios/documentos/mios", t);
  ok(m.s === 200 && m.j.faltan.length === 3 && m.j.cargados.length === 0, "al principio faltan los 3 documentos obligatorios");
  const grande = jpeg(600_000); // ~800 KB en base64: debe pasar por la ruta de documentos
  const u1 = await call("PUT", "/veterinarios/documentos/DOCUMENTO_FRENTE", t, { imagen: grande });
  ok(u1.s === 200 && u1.j.faltan.length === 2, "subir DNI (frente) de ~600 KB: ok, faltan 2 (" + u1.s + ")");
  const u2 = await call("PUT", "/veterinarios/documentos/TITULO", t, { imagen: jpeg(5000) });
  const u3 = await call("PUT", "/veterinarios/documentos/HABILITACION", t, { imagen: jpeg(5000) });
  ok(u2.s === 200 && u3.s === 200 && u3.j.faltan.length === 0, "con título y habilitación no falta nada");
  const reemplazo = await call("PUT", "/veterinarios/documentos/TITULO", t, { imagen: jpeg(6000) });
  ok(reemplazo.s === 200 && q(`select count(*) from "DocumentoVeterinario" d join "Veterinario" v on v.id=d."veterinarioId" where v.email='sinseguro@v.test' and d.tipo='TITULO'`) === "1", "subir de nuevo el mismo documento lo reemplaza (no duplica)");
  const malo = await call("PUT", "/veterinarios/documentos/TITULO", t, { imagen: "data:image/jpeg;base64," + Buffer.from("esto no es una imagen").toString("base64") });
  ok(malo.s === 400, "un archivo que no es imagen real: 400 (" + malo.s + ")");
  const html = await call("PUT", "/veterinarios/documentos/TITULO", t, { imagen: "data:text/html;base64,PGI+aG9sYTwvYj4=" });
  ok(html.s === 400, "tipo que no es imagen: 400");
  const tipoMalo = await call("PUT", "/veterinarios/documentos/OTRO", t, { imagen: jpeg(100) });
  ok(tipoMalo.s === 400, "tipo de documento inexistente: 400");
  const enorme = await call("PUT", "/veterinarios/documentos/TITULO", t, { imagen: jpeg(1_200_000) });
  ok(enorme.s === 400, "imagen de más de 950 KB: 400 (" + enorme.s + ")");
  const sinToken = await call("PUT", "/veterinarios/documentos/TITULO", null, { imagen: jpeg(100) });
  ok(sinToken.s === 401, "sin sesión: 401");
  // el límite de 100 KB sigue vigente para el resto de la API
  const g = await call("PUT", "/veterinarios/foto", t, { foto: "data:image/jpeg;base64," + "A".repeat(200_000) });
  ok(g.s === 413, "el resto de la API sigue limitado a 100 KB (" + g.s + ")");

  // 5. Solo el administrador ve las imágenes
  const vetId = q(`select id from "Veterinario" where email='sinseguro@v.test'`);
  const otroVet = r2.j.accessToken;
  const noAdmin = await call("GET", `/veterinarios/${vetId}/documentos`, otroVet);
  ok(noAdmin.s === 403, "otro veterinario NO puede ver los documentos (" + noAdmin.s + ")");
  const tutor = await call("GET", `/veterinarios/${vetId}/documentos`, null);
  ok(tutor.s === 401, "sin sesión NO puede ver los documentos");
  await call("POST", "/auth/admin/registrar", null, { nombre: "A", email: "a@a.test", password: "AdminPass123!" }, { "x-admin-key": "k" });
  const ad = await call("POST", "/auth/admin/login", null, { email: "a@a.test", password: "AdminPass123!" });
  const docs = await call("GET", `/veterinarios/${vetId}/documentos`, ad.j?.accessToken);
  ok(docs.s === 200 && docs.j.length === 3 && docs.j.every((d) => d.imagen.startsWith("data:image/jpeg")), "el administrador ve las 3 imágenes (" + docs.s + ")");
  const pend = await call("GET", "/veterinarios/pendientes", ad.j?.accessToken);
  const fila = (pend.j || []).find((x) => x.id === vetId);
  ok(fila && fila.documentos.length === 3 && fila.seguroVenceEl === null, "la lista de pendientes trae qué documentos tiene y el seguro vacío");
  ok(fila && !("passwordHash" in fila) && !("resetTokenHash" in fila) && !("mercadoPagoAccessToken" in fila), "la lista de pendientes NO trae hashes ni tokens");
  // las fotos no se filtran en endpoints públicos
  const dir = await call("GET", "/veterinarios/directorio", null);
  ok(!JSON.stringify(dir.j).includes("documentos"), "el directorio público no expone documentos");

  // 6. Sin seguro no se rompe la habilitación ni el control de vencimientos
  const hab = await call("PATCH", `/veterinarios/${vetId}/habilitar`, ad.j?.accessToken);
  ok(hab.s === 200 || hab.s === 201, "habilitar a un veterinario sin seguro funciona (" + hab.s + ")");
  limpiar();
  console.log(f ? `\n${f} FALLA(S)` : "\nTODO OK");
  process.exit(f ? 1 : 0);
})();
