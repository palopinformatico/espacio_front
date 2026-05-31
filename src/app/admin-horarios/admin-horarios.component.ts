import { Component, OnInit } from '@angular/core';
import { HorariosService } from '../services/horarios.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-admin-horarios',
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './admin-horarios.component.html',
  styleUrls: ['./admin-horarios.component.css']
})
export class AdminHorariosComponent implements OnInit {

  horarios: any[] = [];
  loading = false;
  mensaje = '';
  domingo_habilitado: boolean;

  constructor(private horariosService: HorariosService) {
    this.domingo_habilitado = false;  // Inicializar checkbox de domingo
  }

  ngOnInit(): void {
    this.loadHorarios();
  }

  loadHorarios() {
    this.loading = true;
    this.horariosService.getAll().subscribe({
      next: data => {
        // Convertir trabaja_domingo de 'S'/'N' a booleano para el checkbox
        this.horarios = data.map(h => ({
          ...h,
          trabaja_domingo: h.trabaja_domingo === 'S'
        }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

guardar(h: any) {
    // Validar que hora_fin sea mayor que hora_inicio
    if (h.hora_fin <= h.hora_inicio) {
      this.mensaje = 'La hora final debe ser mayor que la hora de inicio ';
      setTimeout(() => this.mensaje = '', 4000);
      return;
    }

    // Validar si es domingo y está habilitado
    const diaActual = new Date().getDay(); // 0 = Domingo
    const esDomingo = diaActual === 0;
    
    if (esDomingo && !h.trabaja_domingo) {
      this.mensaje = 'Debe habilitar los domingos para poder guardar horarios que incluyan domingo ';
      setTimeout(() => this.mensaje = '', 4000);
      return;
    }

    const { id, ...payload } = h;

    // Convertir trabaja_domingo a string 'S'/'N' para compatibilidad con backend
    const payloadBackend = {
      ...payload,
      trabaja_domingo: payload.trabaja_domingo ? 'S' : 'N'
    };

    console.log('🔍 Enviando al backend:', { id, payload: payloadBackend });

    this.horariosService.updateHorario(id, payloadBackend).subscribe({
      next: res => {
        this.mensaje = 'Horario actualizado correctamente ';
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: err => {
        console.error('Error al guardar horario', err);
        this.mensaje = 'Error al guardar horario ';
        setTimeout(() => this.mensaje = '', 3000);
      }
    });
  }

  mostrarMensaje(msg: string) {
    this.mensaje = msg;
    setTimeout(() => this.mensaje = '', 3500);
  }
}
