import { Injectable } from '@angular/core';
import { HorariosService } from './horarios.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface DisponibilidadStatus {
  localDisponible: boolean;
  deliveryDisponible: boolean;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {
  constructor(private horariosService: HorariosService) {}

  /**
   * Verifica la disponibilidad del restaurante para local y delivery
   * según el día actual, horario configurado y campo trabaja_domingo
   */
  verificarDisponibilidad(): Observable<DisponibilidadStatus> {
    return this.horariosService.getConfig().pipe(
      map(config => {
        const now = new Date();
        const diaSemana = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
        const horaActual = now.getHours() * 60 + now.getMinutes();
        
        const local = config.local;
        const delivery = config.delivery;
        
        // Verificar disponibilidad para LOCAL
        let localDisponible = false;
        if (local && local.enabled) {
          const inicioLocal = this.convertirHoraAMinutos(local.hora_inicio);
          const finLocal = this.convertirHoraAMinutos(local.hora_fin);
          
          // Si es domingo, verificar trabaja_domingo
          if (diaSemana === 0) {
            localDisponible = local.trabaja_domingo && horaActual >= inicioLocal && horaActual <= finLocal;
          } else {
            // De lunes a sábado
            localDisponible = horaActual >= inicioLocal && horaActual <= finLocal;
          }
        }
        
        // Verificar disponibilidad para DELIVERY
        let deliveryDisponible = false;
        if (delivery && delivery.enabled) {
          const inicioDelivery = this.convertirHoraAMinutos(delivery.hora_inicio);
          const finDelivery = this.convertirHoraAMinutos(delivery.hora_fin);
          
          // Si es domingo, verificar trabaja_domingo
          if (diaSemana === 0) {
            deliveryDisponible = delivery.trabaja_domingo && horaActual >= inicioDelivery && horaActual <= finDelivery;
          } else {
            // De lunes a sábado
            deliveryDisponible = horaActual >= inicioDelivery && horaActual <= finDelivery;
          }
        }
        
        // Generar mensaje informativo con horarios reales
        let mensaje = '';
        if (!localDisponible && !deliveryDisponible) {
          if (diaSemana === 0) {
            mensaje = 'Hoy domingo estamos cerrados. Volvemos pronto 🕐';
          } else {
            const horarioLocal = local ? `${local.hora_inicio} a ${local.hora_fin}` : 'no disponible';
            const horarioDelivery = delivery ? `${delivery.hora_inicio} a ${delivery.hora_fin}` : 'no disponible';
            
            // Verificar individualmente si domingo está habilitado para cada servicio
            const domingoLocalHabilitado = local && local.trabaja_domingo === 'S';
            const domingoDeliveryHabilitado = delivery && delivery.trabaja_domingo === 'S';
            
            // Construir el mensaje con el rango de días correcto para cada servicio
            const rangoLocal = domingoLocalHabilitado ? 'Lunes a Domingo' : 'Lunes a Sábado';
            const rangoDelivery = domingoDeliveryHabilitado ? 'Lunes a Domingo' : 'Lunes a Sábado';
            
            if (local.enabled && delivery.enabled && local.hora_inicio === delivery.hora_inicio && local.hora_fin === delivery.hora_fin && rangoLocal === rangoDelivery) {
              mensaje = `Fuera del horario de atención. Nuestros horarios son: ${rangoLocal} de ${horarioLocal}`;
            } else {
              mensaje = `Fuera del horario de atención. Nuestros horarios son:\nLocal: ${rangoLocal} de ${horarioLocal}\nDelivery: ${rangoDelivery} de ${horarioDelivery}`;
            }
          }
        } else if (!localDisponible && deliveryDisponible) {
          mensaje = 'Solo disponible para delivery en este momento 🛵';
        } else if (localDisponible && !deliveryDisponible) {
          mensaje = 'Solo disponible para consumo en local 🍽️';
        }
        
        return {
          localDisponible,
          deliveryDisponible,
          mensaje: mensaje || undefined
        };
      }),
      catchError(error => {
        console.error('Error al verificar disponibilidad:', error);
        // En caso de error, permitir todo por defecto
        return of({
          localDisponible: true,
          deliveryDisponible: true,
          mensaje: 'No se pudo verificar el horario. Servicio habilitado por defecto.'
        });
      })
    );
  }
  
  /**
   * Verifica solo la disponibilidad de delivery
   */
  verificarDisponibilidadDelivery(): Observable<boolean> {
    return this.verificarDisponibilidad().pipe(
      map(status => status.deliveryDisponible)
    );
  }
  
  /**
   * Verifica solo la disponibilidad de local
   */
  verificarDisponibilidadLocal(): Observable<boolean> {
    return this.verificarDisponibilidad().pipe(
      map(status => status.localDisponible)
    );
  }
  
  /**
   * Convierte una hora en formato "HH:MM" a minutos desde medianoche
   */
  private convertirHoraAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }
  
  /**
   * Obtiene el nombre del día actual
   */
  getNombreDiaActual(): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date().getDay()];
  }
  
  /**
   * Verifica si hoy es domingo
   */
  esDomingo(): boolean {
    return new Date().getDay() === 0;
  }
}
