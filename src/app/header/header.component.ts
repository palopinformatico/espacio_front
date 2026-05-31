import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  currentUser: any = null;
  private isLoggingOut = false;

  userName = 'Usuario';
  userImage = '/logo.png';

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    // Si está en proceso de logout, no hacer nada
    if (this.isLoggingOut) {
      return;
    }
    
    const token = this.authService.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const userId = decoded.sub || decoded.id;

        if (userId) {
          this.usuarioService.obtenerPorId(userId).subscribe({
            next: (user) => {
              // Debug: mostrar respuesta del backend
              console.log('Usuario desde backend:', user);
              // Verificar nuevamente que no esté en logout
              if (!this.isLoggingOut) {
                this.currentUser = user;
                this.userName = user.full_name || user.username || decoded.username || 'Usuario';
                console.log('UserName asignado:', this.userName);
                this.userImage = this.getProfileImageUrl(user.profileImage);
              }
            },
            error: (err) => {
              console.error('Error al cargar usuario:', err);
            }
          });
        }
      } catch (error) {
        console.error('Error al decodificar token:', error);
      }
    }
  }

  getProfileImageUrl(profileImage: string): string {
    // Si no hay imagen, usar el logo por defecto
    if (!profileImage || profileImage === 'null' || profileImage === 'undefined') {
      return '/logo.png';
    }

    // Si ya es una URL completa, devolverla tal cual
    if (profileImage.startsWith('http')) {
      return profileImage;
    }

    // Si empieza con /uploads/, agregar el dominio base
    if (profileImage.startsWith('/uploads/')) {
      return `https://espacioboulevard.com${profileImage}`;
    }

    // Si empieza con uploads/ (sin barra inicial), agregar barra y dominio
    if (profileImage.startsWith('uploads/')) {
      return `https://espacioboulevard.com/${profileImage}`;
    }

    // Para cualquier otro caso, asumir que es solo el nombre del archivo
    return `https://espacioboulevard.com/uploads/profile-images/${profileImage}`;
  }

  logout() {
    // Limpiar todo primero
    this.authService.logout();

    // Resetear estado del componente
    this.currentUser = null;
    this.userName = 'Usuario';
    this.userImage = '/logo.png';

    // Forzar limpieza completa del navegador y recargar para actualizar UI
    this.router.navigate(['']).then(() => {
      window.location.reload();
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/entrar']);
  }
}
