const { execFileSync } = require("child_process");
const fs = require("fs");
const bcrypt = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/node_modules/bcryptjs");
const API = "http://localhost:3999";
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
const call = async (m, path, token, body, extra={}) => {
  const r = await fetch(API + path, { method: m, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
(async () => {
  // limpiar todo
  q(`truncate "SolicitudAtencion","Calificacion","CierreCaso","Pago","DisputaCalidad","DisputaIdentidad","PuntoPremio","IntakeFormulario","VerificacionIdentidad","PushSuscripcion","SesionVeterinario","Caso","Cliente","Admin","Veterinario","CambioPrecios" cascade`);
  const out = { vets: {}, tokens: {}, casos: {} };
  // admin
  await call("POST", "/auth/admin/registrar", null, { nombre: "Sergio", email: "admin@videollamadaanimal.test", password: "AdminPass123!" }, { "x-admin-key": "k" });
  const la = await call("POST", "/auth/admin/login", null, { email: "admin@videollamadaanimal.test", password: "AdminPass123!" });
  out.admin = la.j;
  // veterinarios
  const lista = [
    ["Ana", "Pérez", "ana@vet.test", "HABILITADO", "CONECTADO"],
    ["Luis", "Gómez", "luis@vet.test", "HABILITADO", "CONECTADO"],
    ["Sofía", "Ramírez", "sofia@vet.test", "HABILITADO", "STAND_BY"],
    ["Diego", "Alonso", "diego@vet.test", "HABILITADO", "DESCONECTADO"],
    ["Martín", "Díaz", "martin@vet.test", "PENDIENTE_VERIFICACION", "DESCONECTADO"],
    ["Lucía", "Fernández", "lucia@vet.test", "SUSPENDIDO_MATRICULA_VENCIDA", "DESCONECTADO"],
    ["Tomás", "Giménez", "tomas@vet.test", "HABILITADO", "DESCONECTADO"],
  ];
  for (const [n, a, email, estado, pres] of lista) {
    await new Promise((r) => setTimeout(r, 13000));
    const r = await call("POST", "/auth/veterinario/registrar", null, { nombre: n, apellido: a, email, password: "abcdefgh1", dniONumero: "30111222", matriculaNumero: "MP " + Math.floor(1000 + Math.random()*8000), matriculaColegio: "Colegio de Médicos Veterinarios de Santa Fe", matriculaVenceEl: "2030-01-01T00:00:00Z", seguroAseguradora: "Seguros Rivadavia", seguroPoliza: "POL-" + Math.floor(Math.random()*99999), seguroVenceEl: "2030-01-01T00:00:00Z", aceptoConvenio: true, especiesAtiende: n==="Ana"?["perro","gato"]:n==="Luis"?["perro","gato","conejo","roedor","ave"]:n==="Sofía"?["perro","gato","reptil","anfibio","pez"]:["perro","gato","caballo","vaca","pequeno_rumiante"] });
    q(`update "Veterinario" set estado='${estado}', presencia='${pres}', disponible=${pres==="CONECTADO"}, "ultimaSenal"=now(), "onboardingCompletado"=true where email='${email}'`);
    const id = q(`select id from "Veterinario" where email='${email}'`);
    out.vets[n] = { id, email };
    { const F = JSON.parse(fs.readFileSync("fotos-prueba.json")); if (F[n]) q(`update "Veterinario" set "fotoPerfil"='${F[n]}', "fotoActualizadaEl"=now() where email='${email}'`); }
    if (estado === "HABILITADO" && email !== "tomas@vet.test") q(`update "Veterinario" set "paypalEmail"='${n.toLowerCase()}@paypal.test' where email='${email}'`);
    if (estado === "HABILITADO") {
      const l = await call("POST", "/auth/veterinario/login", null, { email, password: "abcdefgh1" });
      out.vets[n].login = l.j;
    }
  }
  q(`update "Veterinario" set "matriculaVenceEl"='2026-10-01' where email='lucia@vet.test'`);
  // cliente
  const tel = "+5493410000001";
  await call("POST", "/auth/cliente/otp/solicitar", null, { telefono: tel });
  q(`update "Cliente" set "otpCodeHash"='${await bcrypt.hash("123456", 4)}', "otpExpiraEl"=now()+interval '5 minutes' where telefono='5493410000001'`);
  const v = await call("POST", "/auth/cliente/otp/verificar", null, { telefono: tel, codigo: "123456" });
  out.cliente = v.j;
  const tC = v.j.accessToken;
  fs.writeFileSync("seed1.json", JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ admin: !!out.admin?.accessToken, vets: Object.fromEntries(Object.entries(out.vets).map(([k, x]) => [k, !!x.login?.accessToken])), cliente: !!tC, loginKeys: Object.keys(out.vets.Ana.login || {}), clienteKeys: Object.keys(out.cliente) }));
})().catch(e => { console.error(e); process.exit(1); });
