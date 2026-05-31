import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Ingreso, CreateIngresoDto, UpdateIngresoDto } from './models/ingreso.model';

@Injectable({
    providedIn: 'root'
})
export class IngresoService {
    private apiUrl = environment.api.ingresos;

    constructor(private http: HttpClient) { }

    obtenerIngresos(): Observable<Ingreso[]> {
        console.log('🔍 IngresoService: Obteniendo ingresos desde', `${this.apiUrl}`);
        const token = localStorage.getItem('token');
        console.log('🔑 IngresoService: Token en localStorage:', !!token);
        console.log('📋 IngresoService: Token (primeros 20 chars):', token?.substring(0, 20) + '...' || 'N/A');

        const headers = new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });

        return this.http.get<Ingreso[]>(`${this.apiUrl}`, { headers }).pipe(
            // Log para ver la respuesta cruda del backend
            tap((data) => console.log('📦 IngresoService: Datos recibidos del backend:', data))
        );
    }

    crearIngreso(ingreso: CreateIngresoDto): Observable<Ingreso> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
        return this.http.post<Ingreso>(`${this.apiUrl}`, ingreso, { headers });
    }

    actualizarIngreso(id: number, ingreso: UpdateIngresoDto): Observable<Ingreso> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
        return this.http.patch<Ingreso>(`${this.apiUrl}/${id}`, ingreso, { headers });
    }

    eliminarIngreso(id: number): Observable<void> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
    }

    obtenerIngresoPorId(id: number): Observable<Ingreso> {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': token ? `Bearer ${token}` : ''
        });
        return this.http.get<Ingreso>(`${this.apiUrl}/${id}`, { headers });
    }
}
