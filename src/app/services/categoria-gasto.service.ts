import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategoriaGasto {
  id?: number;
  nombre: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriaGastoService {
  private apiUrl = environment.api.categoriaGasto; // cambia según tu backend

  constructor(private http: HttpClient) {}

  // Obtener todas las categorías
  getCategorias(): Observable<CategoriaGasto[]> {
    return this.http.get<CategoriaGasto[]>(this.apiUrl);
  }

  // Obtener una categoría por ID
  getCategoria(id: number): Observable<CategoriaGasto> {
    return this.http.get<CategoriaGasto>(`${this.apiUrl}/${id}`);
  }

  // Crear nueva categoría
  crearCategoria(categoria: CategoriaGasto): Observable<CategoriaGasto> {
    return this.http.post<CategoriaGasto>(this.apiUrl, categoria);
  }

  // Actualizar categoría
  actualizarCategoria(id: number, categoria: CategoriaGasto): Observable<CategoriaGasto> {
    return this.http.patch<CategoriaGasto>(`${this.apiUrl}/${id}`, categoria);
  }

  // Eliminar categoría
  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
