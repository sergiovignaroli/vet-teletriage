const { execFileSync } = require("child_process"); const fs = require("fs");
const API = "http://localhost:3999";
const q = (sql) => execFileSync("psql", ["-h","localhost","-p","5544","-U","postgres","-d","vet","-tAc",sql]).toString().trim();
const call = async (m, path, token, body) => { const r = await fetch(API + path, { method: m, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
(async () => {
  const S = JSON.parse(fs.readFileSync("seed1.json")); const O = JSON.parse(fs.readFileSync("seed2.json"));
  const tC = S.cliente.accessToken; const vt = (n) => S.vets[n].login.accessToken;
  const mk = async (ctx) => (await call("POST", "/casos", tC, { banderas: { dificultadRespiratoria:false, inconsciente:false, sangradoActivo:false, sospechaIngestaToxico:false, convulsionEnCurso:false, noPuedeParseCaminar:false, distensionAbdominal:false, traumatismoMayor:false }, contexto: ctx })).j.id;
  // dos casos cerrados (uno sin calificar, uno ya calificado)
  O.cerrado = await mk({ especie: "gato", raza: "Común europeo", motivoConsulta: "Estornuda mucho" });
  O.cerrado2 = await mk({ especie: "perro", raza: "Mestizo", motivoConsulta: "Control de cachorro" });
  for (const [id, vet] of [[O.cerrado, "Ana"], [O.cerrado2, "Luis"]]) {
    q(`update "Caso" set estado='CERRADO', "veterinarioId"='${S.vets[vet].id}' where id='${id}'`);
  }
  // postergación de Sofía (turno propuesto)
  O.postergado = await mk({ especie: "conejo", raza: "Cabeza de león", motivoConsulta: "No come desde la mañana" });
  let r = await call("POST", `/solicitudes/caso/${O.postergado}`, tC, { veterinarioId: S.vets["Sofía"].id, aceptoTerminos: true });
  r = await call("POST", `/solicitudes/${r.j.id}/postergar`, vt("Sofía"), { minutos: 60 }); console.log("postergar", r.s);
  fs.writeFileSync("seed2.json", JSON.stringify(O, null, 1)); console.log(O);
})().catch(e => { console.error(e); process.exit(1); });
