import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClienteIngreso } from './models/ingreso.model';

@Injectable({
    providedIn: 'root'
})
export class ClienteIngresoService {
    private apiUrl = environment.api.clientesIngresos;

    constructor(private http: HttpClient) { }

    obtenerClientes(): Observable<ClienteIngreso[]> {
        return this.http.get<ClienteIngreso[]>(`${this.apiUrl}`);
    }

    crearCliente(cliente: { nombre: string }): Observable<ClienteIngreso> {
        return this.http.post<ClienteIngreso>(`${this.apiUrl}`, cliente);
    }

    actualizarCliente(id: number, cliente: { nombre: string }): Observable<ClienteIngreso> {
        return this.http.patch<ClienteIngreso>(`${this.apiUrl}/${id}`, cliente);
    }

    eliminarCliente(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
