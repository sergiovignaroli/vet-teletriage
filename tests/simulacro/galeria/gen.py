import os
import json, html
M="m"; D="d"
def v(label,f): return {"l":label,"f":f}
S=[]
def add(id,sec,t,ruta,probar,vistas): S.append(dict(id=id,sec=sec,t=t,ruta=ruta,p=probar,v=vistas))

P="Páginas públicas"
add("portada",P,"Portada","/","Recorré toda la página. Verificá que no haya precios destacados, que los dos accesos se entiendan solos y que el nombre lleve el logo y el ® en el encabezado, los textos y el pie.",[v("Celular","01-portada-m"),v("Computadora","01-portada-d")])
add("quienes",P,"Quiénes somos","/quienes-somos","Corregido: el encabezado ahora lleva el logo completo (ícono + Videollamada Animal®) en celular y en computadora. Leé el texto y mirá que el tono y los colores sean los de la portada.",[v("Celular","02-quienes-somos-m"),v("Computadora","02-quienes-somos-d"),v("Encabezado 360 px","70-quienes-somos-header-360"),v("Encabezado 1280 px","70-quienes-somos-header-1280")])
add("directorio",P,"Directorio de veterinarios","/veterinarios","Los profesionales habilitados con su foto, calificación y las especies que atiende cada uno. Sin datos de contacto.",[v("Celular","03-veterinarios-m"),v("Computadora","03-veterinarios-d")])
add("contacto",P,"Contacto","/contacto","Ahora el correo electrónico va primero y el teléfono después. Todavía no cargaste el email real, así que hoy no se muestra (no inventamos ninguno): la segunda captura es solo una prueba con un correo de ejemplo. Se carga desde Administración.",[v("Hoy (sin email)","04-contacto-m"),v("Con email de ejemplo","71-contacto-con-email-m"),v("Computadora","04-contacto-d")])
add("legales",P,"Datos legales","/datos-legales","Razón social, CUIT y domicilio: confirmá que estén bien escritos.",[v("Celular","05-datos-legales-m"),v("Computadora","05-datos-legales-d")])
add("terminos",P,"Términos y condiciones","/terminos","Texto legal en borrador para tu abogado. Mirá la presentación, no el contenido jurídico.",[v("Celular","06-terminos-m"),v("Computadora","06-terminos-d")])
add("privacidad",P,"Política de privacidad","/privacidad","Mismo criterio: presentación ahora, redacción final con el abogado.",[v("Celular","07-privacidad-m"),v("Computadora","07-privacidad-d")])
add("convenio",P,"Convenio veterinario","/convenio-veterinario","Es lo que acepta el colega al registrarse. Los precios se leen en vivo de la configuración.",[v("Celular","08-convenio-m"),v("Computadora","08-convenio-d")])
add("e404",P,"Página no encontrada","(cualquier ruta inexistente)","Pantalla de error con la marca. Probá que el botón te devuelva al inicio.",[v("Celular","09-404-m"),v("Computadora","09-404-d")])

I="Ingreso y registro"
add("ing-tutor",I,"Ingreso del tutor","/ingresar","Pedís el código por WhatsApp, lo ingresás y entrás. Mirá el segundo paso también.",[v("Teléfono","10-ingresar-tutor-m"),v("Código","10b-ingresar-codigo-m")])
add("ing-vet",I,"Ingreso del veterinario","/ingresar-veterinario","Email y clave. Probá también el mensaje cuando los datos son incorrectos.",[v("Normal","11-ingresar-vet-m"),v("Con error","11b-ingresar-vet-error-m")])
add("registro",I,"Registro del veterinario","/registrar-veterinario","Formulario completo. Ahora permite subir una foto de perfil (opcional) y pide tildar las especies que atiende (al menos una). El botón no se habilita hasta tildar también el convenio. Las fotos de estas capturas son siluetas de prueba, no personas reales.",[v("Vacío","12-registro-vacio-m"),v("Con foto","12e-registro-foto-m"),v("Especies","12d-registro-especies-m"),v("Completo sin tildar","12b-registro-completo-sin-tildar-m"),v("Completo y tildado","12c-registro-completo-tildado-m")])
add("vet-bienv",I,"Bienvenida del veterinario (3 pasos)","(primer ingreso al panel)","Tres pantallas que explican cómo funciona. Se pueden saltar y volver a ver desde el panel.",[v("Paso 1","13-vet-bienvenida-1-m"),v("Paso 2","13-vet-bienvenida-2-m"),v("Paso 3","13-vet-bienvenida-3-m")])
add("vet-nuevo",I,"Panel del veterinario recién registrado","/panel-veterinario","Cuenta pendiente de aprobación: se ve el estado y qué falta.",[v("Celular","14-vet-panel-recien-registrado-m")])
add("adm-ing",I,"Ingreso de administración","/admin","Acceso solo para vos. Mirá también el error.",[v("Normal","15-admin-ingresar-m"),v("Con error","15b-admin-error-m")])

T="Recorrido del tutor"
add("tut-bienv",T,"Bienvenida del tutor (3 pasos)","(primer ingreso)","Explica el proceso antes de pedir nada. Se puede saltar.",[v("Paso 1","20-tutor-bienvenida-1-m"),v("Paso 2","20-tutor-bienvenida-2-m"),v("Paso 3","20-tutor-bienvenida-3-m")])
add("tut-panel",T,"Panel del tutor","/panel","Sus consultas con estado y el botón para iniciar una nueva. Probá Cerrar sesión arriba.",[v("Celular","21-tutor-panel-m"),v("Computadora","21-tutor-panel-d")])
add("intake",T,"Formulario de la consulta","/nueva-consulta","Ahora la especie se elige de una lista (perros, gatos, exóticos, campo) y de eso depende qué colegas ve el tutor. Mirá también el caso con señal de alarma.",[v("Vacío","22-intake-m"),v("Con señal de alarma","22b-intake-bandera-roja-m"),v("Completo","22c-intake-completo-m")])
add("elegir",T,"Elegir veterinario","/elegir-veterinario/…","Lista de colegas conectados que atienden la especie del animal, con calificación y precio final. Mirá el modo emergencia y el caso sin colegas para esa especie.",[v("Lista (celular)","23-elegir-lista-m"),v("Lista (compu)","23-elegir-lista-d"),v("Emergencia","24-elegir-emergencia-m"),v("Sin colegas para la especie","24b-elegir-sin-colegas-m")])
add("espera",T,"Esperando al veterinario","/espera/…","Pantalla mientras el colega acepta. Se actualiza sola.",[v("Aceptando","25-elegir-aceptando-m"),v("Esperando","26-esperando-m")])
add("turno",T,"Turno propuesto","(aviso en el panel)","Cuando el colega pospone y propone otro horario, el tutor decide.",[v("En el panel","27-turno-propuesto-panel-m"),v("Detalle","27b-turno-propuesto-m")])
add("pago",T,"Consulta aceptada y pago","/elegir-veterinario/…","Resumen y botón de pago. Si el colega solo cobra por PayPal, el botón principal cambia.",[v("Aceptada","28-aceptada-pago-m")])
add("pago-res",T,"Resultado del pago","/pago/éxito · pendiente · fallo","Tres finales posibles. Cada uno dice qué pasa ahora.",[v("Éxito","29-pago-exito-m"),v("Pendiente","29-pago-pendiente-m"),v("Fallo","29-pago-fallo-m")])
add("consulta",T,"Sala de consulta","/consulta/…","Aviso previo antes de la videollamada. La videollamada real (Agora) no se pudo simular acá.",[v("Aviso","30-consulta-aviso-m")])
add("calif",T,"Calificar al veterinario","/calificar/…","Estrellas y comentario. Mirá el estado con estrellas elegidas.",[v("Vacío","31-calificar-m"),v("Con estrellas","31b-calificar-estrellas-m")])
add("repor",T,"Reportar un problema","/reportar/…","Formulario para avisar si algo salió mal en la consulta.",[v("Celular","32-reportar-m")])

V="Recorrido del veterinario"
add("vet-panel",V,"Panel conectado","/panel-veterinario","Estado de presencia, los recuadros nuevos Tu foto y Especies que atendés, y los accesos. Probá Cerrar sesión arriba.",[v("Celular","40-vet-panel-conectado-m"),v("Computadora","40-vet-panel-d")])
add("vet-sol",V,"Nueva solicitud de consulta","(ventana emergente)","Hoja inferior con cuenta regresiva (en rojo los últimos 15 segundos) y opciones para posponer.",[v("Solicitud","41-vet-nueva-consulta-m"),v("Posponer","41b-vet-postergar-m")])
add("vet-aceptar",V,"Después de aceptar","/panel-veterinario","Qué ve el colega cuando ya aceptó y espera el pago.",[v("Celular","42-vet-tras-aceptar-m")])
add("vet-estados",V,"Estados de presencia","/panel-veterinario","Disponible, en pausa y desconectado. Se expira solo si no hay señal por 5 minutos.",[v("En pausa","43-vet-standby-m"),v("Desconectado","44-vet-desconectado-m")])
add("vet-cuenta",V,"Estados de la cuenta","/panel-veterinario","Sin medio de cobro, pendiente de aprobación y suspendida.",[v("Sin cobro","45-vet-sin-cobro-m"),v("Pendiente","46-vet-pendiente-m"),v("Suspendida","46b-vet-suspendida-m")])
add("vet-cobros",V,"Cobros","/panel-veterinario","Conexión con Mercado Pago y alternativa PayPal.",[v("Celular","47-vet-cobros-m")])
add("vet-precios",V,"Mis precios","/panel-veterinario","Precios propios dentro de los límites que fijás vos.",[v("Celular","48-vet-precios-m")])

AY="Ayuda"
add("ayuda-tut",AY,"Ayuda del tutor","/ayuda","Guía de cada función, preguntas frecuentes y un formulario para dejar una pregunta nueva. Abrí un par de preguntas y probá enviar la tuya: te la contesta Administración y la respuesta te aparece acá mismo.",[v("Celular","60-ayuda-tutor-m"),v("Pregunta enviada","61-ayuda-tutor-enviada-m"),v("Computadora","60-ayuda-tutor-d"),v("Sin haber ingresado","62-ayuda-sin-sesion-m")])
add("ayuda-vet",AY,"Ayuda del veterinario","/veterinario/ayuda","Cómo registrarse, conectar el cobro (Mercado Pago o PayPal), conectado/stand by, responder solicitudes, precios y dudas de cobro y pago. También permite dejar una pregunta nueva.",[v("Celular","63-ayuda-vet-m"),v("Pregunta enviada","64-ayuda-vet-enviada-m"),v("Computadora","63-ayuda-vet-d")])
add("ayuda-boton",AY,"Botón de Ayuda en la barra","(todas las pantallas del tutor y del veterinario)","Botón chico con el signo ? al lado del logo; en computadora dice Ayuda. Está en el panel, el formulario, elegir veterinario, pago, calificar y reportar (tutor) y en el panel, los cobros y el registro (veterinario). Miralo en celular chico (360 px).",[v("Panel tutor","65-boton-ayuda-panel-tutor-360"),v("Formulario","66-boton-ayuda-intake-360"),v("Panel veterinario","67-boton-ayuda-panel-vet-360"),v("Cobros","68-boton-ayuda-cobros-360"),v("Registro","69-boton-ayuda-registro-360"),v("Computadora","65-boton-ayuda-panel-tutor-d")])

A="Administración"
add("adm-panel",A,"Panel de administración","/admin","Veterinarios, casos y reportes. Aviso si falta el email de contacto. Secciones Fotos de perfil (para quitar una que no corresponda) y Preguntas de ayuda (las que dejan tutores y veterinarios: podés responderlas o marcarlas como atendidas).",[v("Celular","50-admin-m"),v("Computadora","50-admin-d")])
add("adm-precios",A,"Precios de la plataforma","/admin","Valores base, urgencia y demanda.",[v("Celular","51-admin-precios-m"),v("Computadora","51-admin-precios-d")])
add("adm-tarifas",A,"Tarifas y límites","/admin","Rangos que pueden usar los colegas.",[v("Celular","52-admin-tarifas-m"),v("Computadora","52-admin-tarifas-d")])

secs=[]
for s in S:
    if s["sec"] not in secs: secs.append(s["sec"])
e=html.escape
cards=[]
for s in S:
    vs=""
    for x in s["v"]:
        kind="d" if x["f"].endswith("-d") else "m"
        vs+=f'<figure class="vista {kind}"><div class="marco"><img loading="lazy" src="img/{x["f"]}.jpg" alt="{e(s["t"])} — {e(x["l"])}"></div><figcaption>{e(x["l"])}</figcaption></figure>'
    cards.append(f'''<article class="pantalla" id="p-{s["id"]}" data-id="{s["id"]}" data-sec="{e(s["sec"])}">
<header><div><h3>{e(s["t"])}</h3><code class="ruta">{e(s["ruta"])}</code></div><span class="sello" data-sello>Sin revisar</span></header>
<p class="probar">{e(s["p"])}</p>
<div class="tira">{vs}</div>
<div class="acciones"><button class="b ok" data-estado="ok" type="button">Está bien</button><button class="b mal" data-estado="corregir" type="button">Hay que corregir</button><button class="b ghost" data-estado="" type="button">Limpiar</button></div>
<label class="nota" for="n-{s["id"]}"><span>Qué cambiarías</span><textarea id="n-{s["id"]}" rows="2" placeholder="Escribí acá lo que no te cierra de esta pantalla"></textarea></label>
</article>''')
secs_html=""
for sec in secs:
    secs_html+=f'<section class="grupo" data-grupo="{e(sec)}"><h2>{e(sec)} <small data-cuenta></small></h2><div class="lista">'+"".join(c for c,s in zip(cards,S) if s["sec"]==sec)+'</div></section>'
tabs="".join(f'<button type="button" class="tab" data-filtro="{e(x)}">{e(x)}</button>' for x in secs)
tpl=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'tpl.html')).read()
out=tpl.replace("%%TABS%%",tabs).replace("%%SECCIONES%%",secs_html).replace("%%TOTAL%%",str(len(S))).replace("%%IDS%%",json.dumps([{"id":s["id"],"t":s["t"]} for s in S],ensure_ascii=False))
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'galeria.html'),'w').write(out)
print(len(S),"pantallas",len(out)//1024,"KB")
