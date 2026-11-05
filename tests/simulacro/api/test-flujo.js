process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS || "postgresql://postgres@localhost:5544/precios_test";
const base = (process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/modules";
const { PrismaService } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/apps/api/dist/prisma.service");
const { ConfiguracionService } = require(base + "/configuracion/configuracion.service");
const { PreciosService } = require(base + "/precios/precios.service");
const { CasosService } = require(base + "/casos/casos.service");
const { SolicitudesService } = require(base + "/solicitudes/solicitudes.service");
const { VERSION_AVISO_PRECIOS } = require((process.env.REPO_ROOT || "/home/claude/vet-teletriage") + "/packages/types/src/index.ts");
(async () => {
  const prisma = new PrismaService(); await prisma.$connect();
  const cfg = new ConfiguracionService(prisma);
  const precios = new PreciosService(prisma, cfg);
  const casos = new CasosService(prisma, {}, {}, cfg, precios);
  const eventos = { emitir() {} };
  const notif = { avisarSolicitudNueva: async () => {} };
  const sol = new SolicitudesService(prisma, casos, eventos, notif);
  sol.programarEscalada = () => {}; // sin temporizadores en la prueba
  const fallos = [];
  const ok = (c, m) => { if (!c) { fallos.push(m); console.log("FALLA:", m); } else console.log("ok  :", m); };

  await prisma.tarifaPais.deleteMany(); // vuelve a sembrar con los valores de arranque
  await prisma.veterinario.deleteMany({ where: { email: { startsWith: "flujo-" } } });
  await prisma.cliente.deleteMany({ where: { telefono: "+5490000000001" } });
  const cliente = await prisma.cliente.create({ data: { telefono: "+5490000000001" } });
  const mk = (n, extra = {}) => prisma.veterinario.create({ data: {
    nombre: n, apellido: "Flujo", especiesAtiende: ["perro"], paypalEmail: "cobro@test.local", email: `flujo-${n}@test.local`, passwordHash: "x", dniONumero: "1",
    matriculaNumero: "1", matriculaColegio: "X", matriculaVenceEl: new Date("2030-01-01"),
    seguroAseguradora: "X", seguroPoliza: "1", seguroVenceEl: new Date("2030-01-01"),
    estado: "HABILITADO", presencia: "CONECTADO", disponible: true, ultimaSenal: new Date(), ...extra } });
  const barato = await mk("Barato", { precioNormalDiurno: 17000, precioNormalNocturno: 17000 });
  const caro = await mk("Caro", { precioNormalDiurno: 24000, precioNormalNocturno: 24000 });
  const sinPrecio = await mk("SinPrecio");
  // el dueño fija piso/techo amplios para esta prueba
  const nulo = { dificultadRespiratoria: false, inconsciente: false, sangradoActivo: false, sospechaIngestaToxico: false, convulsionEnCurso: false, noPuedeParseCaminar: false, distensionAbdominal: false, traumatismoMayor: false };
  const caso = await casos.crear({ clienteId: cliente.id, banderas: nulo, contexto: { especie: "perro", motivoConsulta: "prueba" } });
  ok(["DIURNA", "NOCTURNA"].includes(caso.franjaHoraria), "crear() usa la franja de Argentina: " + caso.franjaHoraria);

  const lista = await casos.paraElegir(caso.id, cliente.id);
  const por = Object.fromEntries(lista.map((v) => [v.nombre, v]));
  ok(lista.length === 3, "la lista trae los 3 veterinarios conectados");
  ok(por.Barato.honorarioFinal === 17000 && por.Caro.honorarioFinal === 24000 && por.SinPrecio.honorarioFinal === 20000, "cada vet muestra SU honorario (17000 / 24000 / aconsejado)");
  ok(lista[0].nombre === "Barato", "la lista sale ordenada del más barato al más caro");
  ok(por.Caro.costoTotal === por.Caro.honorarioFinal + Math.max(Math.round(por.Caro.honorarioFinal * 0.11), por.Caro.franja === "DIURNA" ? 2200 : 3200), "costo total = honorario + comisión (11 %, con mínimo)");
  console.log("     lista:", lista.map((v) => `${v.nombre} ${v.honorarioFinal}+${v.costoTotal - v.honorarioFinal}=${v.costoTotal} (${v.franja})`).join(" | "));

  // El tutor elige a "Caro"; después Caro BAJA su precio mientras la solicitud está pendiente
  const s = await sol.crear({ casoId: caso.id, clienteId: cliente.id, veterinarioId: caro.id, aceptoTerminos: true, ip: "1.1.1.1" });
  const fila = await prisma.solicitudAtencion.findUnique({ where: { id: s.id } });
  ok(Number(fila.honorarioOfrecido) === por.Caro.honorarioFinal, "la solicitud congela el honorario que vio el tutor: " + fila.honorarioOfrecido);
  await prisma.veterinario.update({ where: { id: caro.id }, data: { precioNormalDiurno: 18000, precioNormalNocturno: 18000 } });
  const r = await sol.aceptar(s.id, caro.id);
  const casoFinal = await prisma.caso.findUnique({ where: { id: caso.id } });
  ok(r.aceptada === true && casoFinal.estado === "ASIGNADO", "el vet acepta y el caso queda ASIGNADO");
  ok(Number(casoFinal.honorarioDeclarado) === por.Caro.honorarioFinal, "se cobra el precio que el tutor vio (aunque el vet lo haya cambiado después): " + casoFinal.honorarioDeclarado);
  ok(Number(casoFinal.cargoPlataforma) === por.Caro.costoTotal - por.Caro.honorarioFinal, "el cargo de plataforma del caso es la comisión congelada: " + casoFinal.cargoPlataforma);

  await prisma.solicitudAtencion.deleteMany({ where: { casoId: caso.id } });
  await prisma.intakeFormulario.deleteMany({ where: { casoId: caso.id } });
  await prisma.caso.delete({ where: { id: caso.id } });
  await prisma.cliente.delete({ where: { id: cliente.id } });
  await prisma.veterinario.deleteMany({ where: { email: { startsWith: "flujo-" } } });
  await prisma.$disconnect();
  console.log(fallos.length ? `\n${fallos.length} FALLAS` : "\nTODO OK"); process.exit(fallos.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });
