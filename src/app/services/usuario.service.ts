import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = environment.api.users;  // Asegúrate de que esto coincida con tu API

  constructor(private http: HttpClient) { }

  crearUsuario(fullName: string, username: string, password: string, profileImage: File, tipo_usuario: string, data_nacimiento: any): Observable<any> {
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('username', username);
    formData.append('password', password);
    if (profileImage) {
      formData.append('image', profileImage); // Changed from 'profileImage' to 'image' to match backend
    }
    // 🔹 Enviar tanto 'tipo_usuario' como 'role' para asegurar compatibilidad
    formData.append('tipo_usuario', tipo_usuario);
    formData.append('role', tipo_usuario); // Agregar campo 'role' para el backend

    // Formatear fecha si es objeto NgbDateStruct
    let fecha = data_nacimiento;
    if (data_nacimiento && typeof data_nacimiento === 'object' && data_nacimiento.year) {
      const month = data_nacimiento.month.toString().padStart(2, '0');
      const day = data_nacimiento.day.toString().padStart(2, '0');
      fecha = `${data_nacimiento.year}-${month}-${day}`;
    }

    if (fecha) {
      formData.append('fecha_nacimiento', fecha);
    }

    console.log('📝 Creando usuario con role:', tipo_usuario);

    return this.http.post<any>(this.apiUrl, formData).pipe(
      catchError(this.handleError)
    );
  }

  actualizarUsuario(id: number, data: any, image?: File): Observable<any> {
    const formData = new FormData();
    if (data.full_name) formData.append('full_name', data.full_name);
    if (data.username) formData.append('username', data.username);
    if (data.password) formData.append('password', data.password);

    // 🔹 Enviar tanto 'tipo_usuario' como 'role' para asegurar compatibilidad
    if (data.tipo_usuario) {
      formData.append('tipo_usuario', data.tipo_usuario);
      formData.append('role', data.tipo_usuario); // Agregar campo 'role' para el backend
    }

    // Formatear fecha si es objeto NgbDateStruct
    if (data.fecha_nacimiento) {
      let fecha = data.fecha_nacimiento;
      if (typeof fecha === 'object' && fecha.year) {
        const month = fecha.month.toString().padStart(2, '0');
        const day = fecha.day.toString().padStart(2, '0');
        fecha = `${fecha.year}-${month}-${day}`;
      }
      formData.append('fecha_nacimiento', fecha);
    }

    if (image) {
      formData.append('image', image);
    }

    console.log('📝 Actualizando usuario con role:', data.tipo_usuario);

    return this.http.put(`${this.apiUrl}/${id}`, formData).pipe(
      catchError(this.handleError)
    );
  }

  obtener(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  obtenerPorId(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
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

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }


}
