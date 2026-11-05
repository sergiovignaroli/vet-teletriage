const { execFileSync } = require("child_process");
const fs = require("fs");
const API = "http://localhost:3999";
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
const call = async (m, path, token, body) => {
  const r = await fetch(API + path, { method: m, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
(async () => {
  const S = JSON.parse(fs.readFileSync("seed1.json"));
  const tC = S.cliente.accessToken;
  const V = (n) => S.vets[n];
  const vt = (n) => V(n).login.accessToken;
  const mk = async (rojo, ctx) => (await call("POST", "/casos", tC, { banderas: { dificultadRespiratoria: rojo, inconsciente:false, sangradoActivo:false, sospechaIngestaToxico:false, convulsionEnCurso:false, noPuedeParseCaminar:false, distensionAbdominal:false, traumatismoMayor:false }, contexto: ctx })).j;
  const out = {};
  out.elegir = (await mk(false, { especie: "perro", raza: "Labrador", motivoConsulta: "Cojea de la pata trasera desde ayer" })).id;
  out.emergencia = (await mk(true, { especie: "gato", raza: "Siamés", motivoConsulta: "Le cuesta respirar" })).id;
  // pendiente a Ana
  out.pendiente = (await mk(false, { especie: "gato", raza: "Común europeo", motivoConsulta: "Vomita desde la mañana" })).id;
  let r = await call("POST", `/solicitudes/caso/${out.pendiente}`, tC, { veterinarioId: V("Ana").id, aceptoTerminos: true });
  out.solPendiente = r.j; console.log("sol pendiente", r.s, r.j && r.j.estado);
  // asignado con Luis
  out.asignado = (await mk(false, { especie: "perro", raza: "Caniche", motivoConsulta: "Se rasca mucho las orejas" })).id;
  r = await call("POST", `/solicitudes/caso/${out.asignado}`, tC, { veterinarioId: V("Luis").id, aceptoTerminos: true });
  const solA = r.j.id;
  r = await call("POST", `/solicitudes/${solA}/aceptar`, vt("Luis"));
  console.log("aceptar", r.s, JSON.stringify(r.j).slice(0, 200));
  console.log("estado caso", q(`select estado from "Caso" where id='${out.asignado}'`), "pagos:", q(`select count(*) from "Pago" where "casoId"='${out.asignado}'`));
  fs.writeFileSync("seed2.json", JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
