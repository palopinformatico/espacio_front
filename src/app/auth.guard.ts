import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
 // tu servicio de sesión

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  canActivate(route: any): boolean {
    const user = this.auth.getUser(); // obtiene el usuario del token o localStorage
    const expectedRoles = route.data['role'] || route.data['roles'];

    if (!user) {
      // Si no hay usuario, redirige a inicio
      this.router.navigate(['/inicio']);
      return false;
    }

    if (!expectedRoles.includes(user.role)) {
      // Si el rol no coincide, redirige a no autorizado
      this.router.navigate(['/no-autorizado']);
      return false;
    }

    return true;
  }
}
