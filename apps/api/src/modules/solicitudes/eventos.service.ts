import { Injectable } from "@nestjs/common";
import { Observable, Subject, interval, merge, map } from "rxjs";

export interface EventoVeterinario {
  tipo: "solicitud-nueva" | "solicitud-cerrada" | "turno-nuevo" | "turno-activo";
  solicitudId: string;
}

// Canal en tiempo real hacia el panel abierto del veterinario (SSE). Vive en
// memoria: sirve mientras la API corra en una sola instancia (el caso hoy);
// si se escalara a varias, haría falta un bus compartido (Redis). Por eso el
// panel además revisa por consulta normal cada 15 s: un evento perdido no
// deja a nadie sin enterarse.
@Injectable()
export class EventosService {
  private readonly canales = new Map<string, Set<Subject<EventoVeterinario>>>();

  // Un flujo por pestaña abierta, con un latido de conexión cada 25 s para
  // que los proxies no cierren el canal por inactividad.
  suscribir(veterinarioId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const sujeto = new Subject<EventoVeterinario>();
      const conjunto = this.canales.get(veterinarioId) ?? new Set();
      conjunto.add(sujeto);
      this.canales.set(veterinarioId, conjunto);

      const eventos = sujeto.pipe(map((e) => ({ type: "evento", data: e }) as MessageEvent));
      const pulso = interval(25_000).pipe(map(() => ({ type: "pulso", data: {} }) as MessageEvent));
      const suscripcion = merge(eventos, pulso).subscribe(observer);
      // Primer mensaje inmediato: confirma al navegador que el canal está vivo.
      observer.next({ type: "listo", data: {} } as MessageEvent);

      return () => {
        suscripcion.unsubscribe();
        conjunto.delete(sujeto);
        if (conjunto.size === 0) this.canales.delete(veterinarioId);
      };
    });
  }

  emitir(veterinarioId: string, evento: EventoVeterinario) {
    this.canales.get(veterinarioId)?.forEach((s) => s.next(evento));
  }

  tieneCanalAbierto(veterinarioId: string): boolean {
    return (this.canales.get(veterinarioId)?.size ?? 0) > 0;
  }
}
