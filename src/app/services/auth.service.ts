import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.api.auth; // ⚡ Ajusta la URL según tu backend
  private usersUrl = environment.api.users;

  constructor(private http: HttpClient) { }

  login(name: string, password: string) {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, { username: name, password })
      .pipe(
        tap(res => {
          localStorage.setItem('token', res.access_token);
        })
      );
  }

  register(user: { username: string; password: string; role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout() {
    // Limpiar token del localStorage
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserRole(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.role ?? null;
    } catch {
      return null;
    }
  }

  getUser(): any | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      // Debug: mostrar contenido del token
      console.log('Token decodificado:', decoded);
      // Asumimos que el token tiene 'sub' como ID o un campo 'id', y 'role'
      const user = {
        id: decoded.sub || decoded.id,
        role: decoded.role,
        username: decoded.username
      };
      console.log('Usuario retornado:', user);
      return user;
    } catch {
      return null;
    }
  }

  getUserProfile(userId: number): Observable<any> {
    return this.http.get(`${this.usersUrl}/${userId}`);
  }

}


