import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaIngreso } from './models/ingreso.model';

@Injectable({
    providedIn: 'root'
})
export class CategoriaIngresoService {
    private apiUrl = environment.api.categoriaIngresos;

    constructor(private http: HttpClient) { }

    obtenerCategorias(): Observable<CategoriaIngreso[]> {
        return this.http.get<CategoriaIngreso[]>(`${this.apiUrl}`);
    }

    crearCategoria(categoria: { nombre_cat: string }): Observable<CategoriaIngreso> {
        return this.http.post<CategoriaIngreso>(`${this.apiUrl}`, categoria);
    }

    actualizarCategoria(id: number, categoria: { nombre: string }): Observable<CategoriaIngreso> {
        return this.http.patch<CategoriaIngreso>(`${this.apiUrl}/${id}`, categoria);
    }

    eliminarCategoria(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
