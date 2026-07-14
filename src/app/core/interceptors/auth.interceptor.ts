import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    // 1. Clonar la request y agregar el token si existe
    const token = localStorage.getItem('token');

    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      //console.log('✅ AuthInterceptor (Class): Token agregado al header Authorization');
    } else {
      //console.log('⚠️ AuthInterceptor (Class): No hay token, petición sin auth header');
    }

    return next.handle(request).pipe(
      // 2. CAPTURAR ERRORES
      catchError((error: HttpErrorResponse) => {

        // Si el error es 401 (Unauthorized), significa que el token venció o es inválido
        if (error.status === 401) {
          console.log('❌ AuthInterceptor (Class): Error 401 - Sesión expirada, redirigiendo al login...');

          // Borramos el token viejo
          localStorage.removeItem('token');

          // Redirigimos al usuario para que se loguee de nuevo
          this.router.navigate(['/auth/entrar']);
        }

        return throwError(() => error);
      })
    );
  }
}
