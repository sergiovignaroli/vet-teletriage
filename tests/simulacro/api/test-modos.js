process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS || "postgresql://postgres@localhost:5544/precios_test";
const base = (process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/modules";
const { PrismaService } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/prisma.service");
const { ConfiguracionService } = require(base + "/configuracion/configuracion.service");
const { PreciosService } = require(base + "/precios/precios.service");
const { VERSION_AVISO_PRECIOS } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/packages/types/src/index.ts");
(async () => {
  const prisma = new PrismaService(); await prisma.$connect();
  const svc = new PreciosService(prisma, new ConfiguracionService(prisma));
  let fallos = 0;
  const ok = (c, m) => { if (!c) { fallos++; console.log("FALLA:", m); } else console.log("ok  :", m); };
  const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return `${e.status ?? ""} ${e.message}`; } };
  await prisma.veterinario.deleteMany({ where: { email: "modos@test.local" } });
  const vet = await prisma.veterinario.create({ data: {
    nombre: "M", apellido: "O", email: "modos@test.local", passwordHash: "x", dniONumero: "1", matriculaNumero: "1", matriculaColegio: "X",
    matriculaVenceEl: new Date("2030-01-01"), seguroAseguradora: "X", seguroPoliza: "1", seguroVenceEl: new Date("2030-01-01"), estado: "HABILITADO",
    avisoPreciosVersion: VERSION_AVISO_PRECIOS, avisoPreciosAceptadoEl: new Date() } });
  const ADM = "00000000-0000-0000-0000-000000000001";
  let p = await svc.misPrecios(vet.id);
  ok(p.modo === "LIBRE", "modo por defecto LIBRE");
  // LIBRE
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 22000 }))) === null, "LIBRE: dentro de la zona se guarda directo");
  let e = await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 30000 }));
  ok(e && e.startsWith("409"), "LIBRE: fuera de la zona pide confirmación (409) -> " + e);
  p = await svc.misPrecios(vet.id);
  ok(p.celdas.find(c => c.clave === "NORMAL_DIURNA").propio === 22000, "LIBRE: sin confirmar no se guardó");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 30000 }, true))) === null, "LIBRE: confirmado se guarda");
  p = await svc.misPrecios(vet.id);
  ok(p.celdas.find(c => c.clave === "NORMAL_DIURNA").efectivo === 30000, "LIBRE: rige 30000 aunque pase el techo");
  e = await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 999999999 }, true));
  ok(e && e.startsWith("400"), "LIBRE: tope técnico (error de tipeo) se rechaza aun confirmando -> " + e);
  e = await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: -5 }, true));
  ok(e && e.startsWith("400"), "LIBRE: negativo rechazado");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 10000 }, true))) === null, "LIBRE: barato (debajo del piso) con confirmación");
  // BANDA
  await svc.guardarModo(ADM, "AR", "BANDA");
  p = await svc.misPrecios(vet.id);
  ok(p.modo === "BANDA" && p.celdas.find(c => c.clave === "NORMAL_DIURNA").efectivo === 16000, "BANDA: el 10000 guardado se sube al piso 16000 al calcular (sin reescribir lo guardado)");
  ok(p.celdas.find(c => c.clave === "NORMAL_DIURNA").propio === 10000, "BANDA: lo guardado sigue intacto");
  e = await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 30000 }, true));
  ok(e && e.startsWith("400"), "BANDA: fuera de la banda se rechaza aun confirmando");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 18000 }))) === null, "BANDA: dentro se guarda");
  // FIJO
  await svc.guardarModo(ADM, "AR", "FIJO");
  p = await svc.misPrecios(vet.id);
  ok(p.celdas.every(c => c.efectivo === c.aconsejado), "FIJO: todos cobran el aconsejado");
  e = await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 18000 }, true));
  ok(e && e.startsWith("400"), "FIJO: no se acepta precio propio");
  // volver a LIBRE recupera
  await svc.guardarModo(ADM, "AR", "LIBRE");
  p = await svc.misPrecios(vet.id);
  ok(p.celdas.find(c => c.clave === "NORMAL_DIURNA").efectivo === 18000, "volver a LIBRE: recupera lo que el veterinario había guardado");
  ok((await lanza(() => svc.guardarModo(ADM, "AR", "OTRO"))) !== null, "modo inválido rechazado");
  // cálculo para el tutor
  const ctx = await svc.contexto("AR");
  const vv = await prisma.veterinario.findUnique({ where: { id: vet.id } });
  const calc = svc.calcular(ctx, vv, false, new Date("2026-11-04T15:00:00Z")); // 12:00 AR, miércoles
  ok(calc.franja === "DIURNA" && calc.honorario === 18000 && calc.total === calc.honorario + calc.cargo, "calcular() usa el precio efectivo del modo");
  const hist = await svc.historial(20);
  ok(hist.some(h => h.resumen.startsWith("Modo de precios AR: LIBRE → BANDA")) && hist.some(h => h.resumen.includes("confirmó precios fuera")), "historial registra cambios de modo y confirmaciones del veterinario");
  await prisma.veterinario.deleteMany({ where: { email: "modos@test.local" } });
  console.log(fallos ? `\n${fallos} FALLAS` : "\nTODO OK");
  await prisma.$disconnect(); process.exit(fallos ? 1 : 0);
})();
