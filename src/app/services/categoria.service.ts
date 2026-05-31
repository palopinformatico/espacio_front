import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface Category {
  id: number;
  nombre: string;
  icono: string;
}

export interface UpdateCategoryDto {
  nombre?: string; // Opcional para patch
  icono?: string;  // Opcional
}




@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private apiUrl = environment.api.categories;  // Asegúrate de que esto coincida con tu API
  private apiUrl2 = `${environment.api.categories}/name`;
  constructor(private http: HttpClient) {}

  // Crear categoría con imagen
  crearCategoria(nombre: string, imagen: File): Observable<any> {
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('imagen', imagen);

    return this.http.post(`${this.apiUrl}/crear`, formData).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener todas las categorías
  obtenerCategorias(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  // Manejo de errores
  private handleError(error: HttpErrorResponse) {
    let errorMsg = 'Ocurrió un error desconocido!';
  
      // Errores del lado del cliente
      errorMsg = `Error: ${error.error.message}`;
    
      // Errores del lado del servidor
      errorMsg = `Error Código: ${error.status}\nMensaje: ${error.message}`;
  
    return throwError(errorMsg);
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  obtenerCategoriaName(name:string): Observable<any> {
    return this.http.get(`this.apiUrl/${name}`).pipe(
      catchError(this.handleError)
    );
  }

  updateCategory(id: number, updateCategoryDto: UpdateCategoryDto): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, updateCategoryDto);
  }

    deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

}
