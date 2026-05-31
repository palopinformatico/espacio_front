import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CostoEnvio {
    id: number;
    precio_envio: number;
    descripcion: string;
    porDefecto: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CostoEnvioService {
    private http = inject(HttpClient);
    private API_URL = environment.api.costoEnvio; // Ajusta según tu configuración

    /**
     * Obtiene la lista de costos de envío
     */
    obtenerCostosEnvio(): Observable<CostoEnvio[]> {
        return this.http.get<CostoEnvio[]>(this.API_URL);
    }

    /**
     * Obtiene un costo de envío específico por ID
     */
    obtenerCostoEnvioPorId(id: number): Observable<CostoEnvio> {
        return this.http.get<CostoEnvio>(`${this.API_URL}/${id}`);
    }

    /**
     * Crea un nuevo costo de envío
     */
    crearCostoEnvio(data: { precio_envio: number; descripcion?: string; porDefecto?: boolean }): Observable<CostoEnvio> {
        return this.http.post<CostoEnvio>(this.API_URL, data);
    }

    /**
     * Actualiza un costo de envío existente
     */
    actualizarCostoEnvio(id: number, data: { precio_envio: number; descripcion?: string; porDefecto?: boolean }): Observable<CostoEnvio> {
        return this.http.patch<CostoEnvio>(`${this.API_URL}/${id}`, data);
    }

    /**
     * Elimina un costo de envío
     */
    eliminarCostoEnvio(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${id}`);
    }
}
