import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authFunctionalInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Inyectamos dependencias (en funcionales se usa inject() en vez de constructor)
  const router = inject(Router);

  // 2. Obtener token
  const token = localStorage.getItem('token');

  console.log('🔐 Interceptor: Petición a:', req.url);
  console.log('🔑 Interceptor: Token existe:', !!token);
  console.log('📋 Interceptor: Token (primeros 20 chars):', token ? token.substring(0, 20) + '...' : 'N/A');

  // 3. Clonar request si hay token
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Interceptor: Token agregado al header Authorization');
  } else {
    console.log('⚠️ Interceptor: No hay token, petición sin auth header');
  }

  // 4. Pasar al siguiente manejador y capturar errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      // Si el error es 401 (No autorizado / Token vencido)
      if (error.status === 401) {
        console.warn('Sesión expirada. Redirigiendo al login...');
        
        // Limpiamos basura
        localStorage.removeItem('token');
        
        // Redirigimos
        router.navigate(['/auth/entrar']);
      }

      // Propagamos el error para que el componente también se entere si es necesario
      return throwError(() => error);
    })
  );
};
