process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS || "postgresql://postgres@localhost:5544/precios_test";
const base = (process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/modules";
const { PrismaService } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/prisma.service");
const { ConfiguracionService } = require(base + "/configuracion/configuracion.service");
const { PreciosService } = require(base + "/precios/precios.service");
const { VERSION_AVISO_PRECIOS } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/packages/types/src/index.ts");
(async () => {
  const prisma = new PrismaService();
  await prisma.$connect();
  const cfg = new ConfiguracionService(prisma);
  const svc = new PreciosService(prisma, cfg);
  const fallos = [];
  const ok = (cond, msg) => { if (!cond) { fallos.push(msg); console.log("FALLA:", msg); } else console.log("ok  :", msg); };
  const lanza = async (fn) => { try { await fn(); return null; } catch (e) { return e.message || String(e); } };

  await prisma.veterinario.deleteMany({ where: { email: "prueba-precios@test.local" } });
  const vet = await prisma.veterinario.create({ data: {
    nombre: "Prueba", apellido: "Precios", email: "prueba-precios@test.local", passwordHash: "x",
    dniONumero: "1", matriculaNumero: "1", matriculaColegio: "X", matriculaVenceEl: new Date("2030-01-01"),
    seguroAseguradora: "X", seguroPoliza: "1", seguroVenceEl: new Date("2030-01-01"), estado: "HABILITADO",
  }});

  // 1. Siembra con los valores actuales
  let p = await svc.misPrecios(vet.id);
  const nd = p.celdas.find((c) => c.clave === "NORMAL_DIURNA");
  const un = p.celdas.find((c) => c.clave === "URGENCIA_NOCTURNA");
  ok(nd.aconsejado === 20000 && nd.piso === 16000 && nd.techo === 24000, "NORMAL_DIURNA sembrada 16000/20000/24000 (banda heredada ±20 %)");
  ok(un.aconsejado === 35000, "URGENCIA_NOCTURNA arranca igual al diurno (35000), sin recargo inventado");
  ok(p.celdas.every((c) => c.efectivo === c.aconsejado), "sin precio propio rige el aconsejado");
  ok(p.porcentajePlataforma === 11, "comisión 11 %");

  // 2. Aviso obligatorio
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 21000 }))) !== null, "no deja poner precio sin aceptar el aviso");
  ok((await lanza(() => svc.aceptarAviso(vet.id, "version-vieja"))) !== null, "rechaza una versión vieja del aviso");
  p = await svc.aceptarAviso(vet.id, VERSION_AVISO_PRECIOS);
  ok(p.aviso.aceptado === true, "aviso aceptado queda registrado");

  // 3. Banda
  p = await svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 22000 });
  ok(p.celdas.find((c) => c.clave === "NORMAL_DIURNA").efectivo === 22000, "precio propio 22000 dentro de la banda");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 30000 }))) !== null, "rechaza 30000 (sobre el techo)");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: 5000 }))) !== null, "rechaza 5000 (bajo el piso)");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { NORMAL_DIURNA: "1; DROP" }))) !== null, "rechaza texto en vez de número");
  ok((await lanza(() => svc.guardarMisPrecios(vet.id, { HACKEADA: 1 }))) !== null, "rechaza claves desconocidas");

  // 4. Cálculo con hora local (instantes en UTC)
  const vetFila = await prisma.veterinario.findUnique({ where: { id: vet.id } });
  const ctx = await svc.contexto("AR");
  let r = svc.calcular(ctx, vetFila, false, new Date("2026-11-03T15:00:00Z")); // martes 12:00 ART
  ok(r.franja === "DIURNA" && r.honorario === 22000 && r.cargo === 2420 && r.total === 24420, "martes 12:00: 22000 + 11 % (2420) = 24420, diurna");
  r = svc.calcular(ctx, vetFila, false, new Date("2026-11-08T15:00:00Z")); // domingo
  ok(r.franja === "NOCTURNA" && r.honorario === 20000 && r.cargo === 3200, "domingo: nocturna, 20000 + mínimo nocturno 3200");
  r = svc.calcular(ctx, vetFila, true, new Date("2026-11-23T15:00:00Z")); // feriado
  ok(r.franja === "NOCTURNA" && r.honorario === 35000 && r.cargo === 3850, "feriado urgencia: nocturna 35000 + 11 % (3850)");
  r = svc.calcular(ctx, vetFila, false, new Date("2026-11-07T15:00:00Z")); // sábado
  ok(r.franja === "DIURNA", "sábado es diurno");
  r = svc.calcular(ctx, vetFila, false, new Date("2026-11-03T21:30:00Z")); // 18:30 ART
  ok(r.franja === "DIURNA", "18:30 ART es diurna (con la hora UTC del servidor habría dado 'noche')");

  // 5. Panel del dueño
  const admin = "admin-prueba";
  ok((await lanza(() => svc.guardarTarifas(admin, "AR", { NORMAL_DIURNA: { piso: 30000, aconsejado: 20000, techo: 24000 } }))) !== null, "rechaza piso mayor que aconsejado");
  ok((await lanza(() => svc.guardarTarifas(admin, "ar", {}))) !== null, "rechaza país mal escrito");
  const antes = await prisma.cambioPrecios.count();
  const prev = await svc.ajustePorcentual(admin, "AR", 10, undefined, false);
  ok(prev.aplicado === false && prev.despues.NORMAL_DIURNA.aconsejado === 22000, "vista previa +10 %: 20000 → 22000");
  ok((await svc.panel("AR")).tarifas.NORMAL_DIURNA.aconsejado === 20000, "la vista previa no cambia nada");
  ok((await prisma.cambioPrecios.count()) === antes, "la vista previa no deja registro");
  await svc.ajustePorcentual(admin, "AR", 10, undefined, true);
  ok((await svc.panel("AR")).tarifas.NORMAL_DIURNA.aconsejado === 22000, "ajuste +10 % aplicado");
  ok((await prisma.cambioPrecios.count()) === antes + 1, "el ajuste queda registrado");
  // sube el piso por encima de lo que había puesto el vet
  await svc.guardarTarifas(admin, "AR", { NORMAL_DIURNA: { piso: 23000, aconsejado: 24000, techo: 28000 } });
  p = await svc.misPrecios(vet.id);
  ok(p.celdas.find((c) => c.clave === "NORMAL_DIURNA").efectivo === 23000, "si el dueño sube el piso, el precio efectivo del vet sube al piso (lo guardado queda 22000)");
  ok(p.celdas.find((c) => c.clave === "NORMAL_DIURNA").propio === 22000, "lo que guardó el vet no se pisa");

  // 6. Comisión
  await svc.guardarComision(admin, { porcentajePlataforma: 12 });
  ok((await cfg.obtener()).porcentajePlataforma === 12, "comisión cambia a 12 %");
  ok((await lanza(() => svc.guardarComision(admin, { porcentajePlataforma: 80 }))) !== null, "rechaza comisión de 80 %");
  await svc.guardarComision(admin, { porcentajePlataforma: 11 });

  // 7. Ventana y feriados
  ok((await lanza(() => svc.guardarRegla(admin, "AR", { inicioDiurno: "21:00", finDiurno: "20:00" }))) !== null, "rechaza inicio posterior al fin");
  ok((await lanza(() => svc.guardarRegla(admin, "AR", { inicioDiurno: "25:99" }))) !== null, "rechaza hora imposible");
  ok((await lanza(() => svc.agregarFeriado(admin, "AR", "2026-02-30", "Inventado"))) !== null, "rechaza fecha inexistente 30/02");
  let panel = await svc.agregarFeriado(admin, "AR", "2027-01-01", "Año Nuevo");
  ok(panel.feriados.some((f) => f.fecha === "2027-01-01") && panel.faltanFeriadosFuturos === false, "feriado agregado");
  const id = panel.feriados.find((f) => f.fecha === "2027-01-01").id;
  panel = await svc.quitarFeriado(admin, id);
  ok(!panel.feriados.some((f) => f.fecha === "2027-01-01"), "feriado quitado");
  ok((await svc.historial()).length >= 3, "historial de cambios disponible");

  await prisma.veterinario.delete({ where: { id: vet.id } });
  await prisma.$disconnect();
  console.log(fallos.length ? `\n${fallos.length} FALLAS` : "\nTODO OK");
  process.exit(fallos.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
