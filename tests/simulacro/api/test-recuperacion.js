// Recuperar contraseña y usuario (veterinarios) — contra el simulacro (API 3999, mail falso 4525).
// Repetible: borra su propio veterinario al empezar y al terminar.
const { execFileSync } = require("child_process");
const fs = require("fs");
const API = "http://localhost:3999";
const LOG = __dirname + "/../fakes.log";
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
const call = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { "content-type": "application/json", ...(t ? { authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
let f = 0; const ok = (c, t) => { console.log((c ? "OK   " : "FALLA") + " " + t); if (!c) f++; };
const EMAIL = "recuperar@v.test";
const limpiar = () => q(`delete from "Veterinario" where email='${EMAIL}'`);
const mails = () => { try { return JSON.parse(fs.readFileSync(LOG, "utf8")).filter((x) => x.canal === "email"); } catch { return []; } };
const tokenDelUltimoMail = () => {
  const m = mails().filter((x) => x.to.join(" ").includes(EMAIL)).pop();
  if (!m) return null;
  const t = m.body.replace(/=\r\n/g, "").replace(/=3D/g, "=").match(/restablecer-contrasena\?token=([a-f0-9]{64})/);
  return t ? t[1] : null;
};
const esperarMail = async (antes) => { for (let i = 0; i < 20; i++) { if (mails().length > antes) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };

(async () => {
  await fetch("http://localhost:4500/__reset").catch(() => {}); // vacía el registro de mails falsos
  limpiar();
  const reg = await call("POST", "/auth/veterinario/registrar", null, { nombre: "Rec", apellido: "Uperar", email: EMAIL, password: "claveVieja1", dniONumero: "12.345.678", matriculaNumero: "MP-9876", matriculaColegio: "C", matriculaVenceEl: "2030-01-01", seguroAseguradora: "S", seguroPoliza: "P", seguroVenceEl: "2030-01-01", aceptoConvenio: true, especiesAtiende: ["perro"] });
  ok(reg.s === 201 && reg.j.accessToken, "veterinario de prueba registrado (" + reg.s + ")");
  const tokenViejo = reg.j.accessToken;
  let r = await call("GET", "/veterinarios/mi-cobro", tokenViejo); ok(r.s === 200, "sesión inicial funciona (" + r.s + ")");

  // --- recuperar contraseña ---
  let n = mails().length;
  r = await call("POST", "/auth/veterinario/recuperar-contrasena", null, { email: "nadie@no-existe.test" });
  ok(r.s === 201 && r.j.ok === true, "email inexistente: misma respuesta (no revela nada)");
  await new Promise((x) => setTimeout(x, 800));
  ok(mails().length === n, "email inexistente: no se manda ningún mail");

  r = await call("POST", "/auth/veterinario/recuperar-contrasena", null, { email: "  " + EMAIL.toUpperCase() + " " });
  ok(r.s === 201 && r.j.ok === true, "email existente (con mayúsculas y espacios): ok");
  ok(await esperarMail(n), "llegó el mail");
  const token = tokenDelUltimoMail();
  ok(!!token, "el mail trae el enlace con token de 64 caracteres");
  const hash = q(`select "resetTokenHash" from "Veterinario" where email='${EMAIL}'`);
  ok(hash && hash !== token && hash.length === 64, "en la base se guarda el hash, no el token");

  // segundo pedido inmediato: se frena (1 mail cada 2 minutos), responde igual
  n = mails().length;
  r = await call("POST", "/auth/veterinario/recuperar-contrasena", null, { email: EMAIL });
  await new Promise((x) => setTimeout(x, 800));
  ok(r.s === 201 && mails().length === n, "segundo pedido enseguida: responde igual pero no manda otro mail");

  // --- restablecer ---
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token: "x".repeat(64), password: "claveNueva99" }); ok(r.s === 400, "token inventado -> 400");
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token: "abc", password: "claveNueva99" }); ok(r.s === 400, "token con formato raro -> 400");
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token, password: "corta" }); ok(r.s === 400, "contraseña de menos de 8 -> 400");
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token, password: "a".repeat(73) }); ok(r.s === 400, "contraseña de más de 72 -> 400");
  q(`update "Veterinario" set "resetVenceEl"=now()-interval '1 minute' where email='${EMAIL}'`);
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token, password: "claveNueva99" }); ok(r.s === 400, "enlace vencido -> 400");
  q(`update "Veterinario" set "resetVenceEl"=now()+interval '30 minutes' where email='${EMAIL}'`);
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token, password: "claveNueva99" }); ok(r.s === 201 && r.j.ok, "enlace vigente -> contraseña cambiada (" + r.s + ")");
  r = await call("POST", "/auth/veterinario/restablecer-contrasena", null, { token, password: "otraClave123" }); ok(r.s === 400, "el mismo enlace no se puede usar dos veces");

  r = await call("GET", "/veterinarios/mi-cobro", tokenViejo); ok(r.s === 401, "la sesión anterior quedó cerrada (" + r.s + ")");
  r = await call("POST", "/auth/veterinario/login", null, { email: EMAIL, password: "claveVieja1" }); ok(r.s === 401, "la contraseña vieja ya no sirve");
  r = await call("POST", "/auth/veterinario/login", null, { email: EMAIL, password: "claveNueva99" }); ok(r.s === 201 && r.j.accessToken, "la contraseña nueva sirve (" + r.s + ")");
  ok(q(`select "resetTokenHash" is null and "resetVenceEl" is null from "Veterinario" where email='${EMAIL}'`) === "t", "el enlace se borra de la base al usarlo");

  // --- recordar usuario ---
  r = await call("POST", "/auth/veterinario/recordar-usuario", null, { dniONumero: "12345678", matriculaNumero: "mp 9876" });
  ok(r.s === 201 && r.j.emailParcial === "re*******@v.test", "DNI y matrícula con otro formato -> email tapado (" + JSON.stringify(r.j) + ")");
  ok(!JSON.stringify(r.j).includes("recuperar@"), "nunca devuelve el email completo");
  r = await call("POST", "/auth/veterinario/recordar-usuario", null, { dniONumero: "12345678", matriculaNumero: "0000" }); ok(r.s === 400, "matrícula equivocada -> 400");
  r = await call("POST", "/auth/veterinario/recordar-usuario", null, { dniONumero: "", matriculaNumero: "" }); ok(r.s === 400, "campos vacíos -> 400");

  limpiar();
  console.log(f ? `FALLAS: ${f}` : "TODO OK");
  process.exit(f ? 1 : 0);
})();
