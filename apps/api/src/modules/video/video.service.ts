import { Inject, Injectable } from "@nestjs/common";
import { PROVEEDOR_VIDEO, ProveedorVideo } from "./proveedor-video.interface";

@Injectable()
export class VideoService {
  constructor(@Inject(PROVEEDOR_VIDEO) private readonly proveedor: ProveedorVideo) {}

  crearSala(casoId: string): Promise<string | null> {
    return this.proveedor.crearSala(casoId);
  }
}
