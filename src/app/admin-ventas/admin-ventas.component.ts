import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MesaService } from '../services/mesa.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./admin-ventas.component.css'],
  templateUrl: './admin-ventas.component.html',
})
export class AdminVentasComponent implements OnInit {
  mesaId: number | null = null;
  mesas: any[] = [];
  ventasPendientes: any[] = [];
  ventasPagadas: any[] = [];
  ventasCanceladas: any[] = [];

  isLoading:boolean=false;
  activeTab: string = 'Pendiente';
  fechaBusqueda: string = ''; // Fecha para búsqueda

  constructor(private http: HttpClient, private mesaService: MesaService) { }

  ngOnInit(): void {
    this.fechaBusqueda = this.formatearFecha(new Date());
    this.cargarMesas();
    this.cargarVentasDelDia();
  }

  formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  cargarMesas() {
    this.http.get<any[]>(environment.api.mesas)
      .subscribe(res => this.mesas = res);
  }

cargarVentasDelDia() {
  // 1. Activar spinner de carga (opcional pero recomendado)
  this.isLoading = true;

  const params: any = {};
  if (this.mesaId) params.mesaId = this.mesaId;
  if (this.fechaBusqueda) {
    params.desde = this.fechaBusqueda;
    params.hasta = this.fechaBusqueda;
  }

  // NOTA: No enviamos 'estado' en los params para que el backend traiga TODO
  this.http.get<any[]>(environment.api.ventasDiarias, { params })
    .subscribe({
    next: (res) => {
  this.ventasPendientes = res.filter(v => v.estado?.toLowerCase() === 'pendiente');
  this.ventasPagadas    = res.filter(v => v.estado?.toLowerCase() === 'pagado');
  this.ventasCanceladas = res.filter(v => v.estado?.toLowerCase() === 'cancelado');
  this.isLoading = false;
},
      error: (err) => {
        console.error('Error cargando ventas:', err);
        this.isLoading = false;
        // Aquí podrías mostrar una alerta con SweetAlert o Toastr
      }
    });
}

  marcarComoPagado(id: number) {
    Swal.fire({
      title: '¿Marcar como pagado?',
      text: 'Esta venta será marcada como pagada.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, marcar como pagado',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.patch(`${environment.api.orders}/${id}/estado`, { estado: 'pagado' })
          .subscribe({
            next: (res: any) => {
              Swal.fire('Actualizado', 'La venta ha sido marcada como pagada', 'success');
              this.cargarVentasDelDia();
            },
            error: (err) => {
              Swal.fire('Error', err.error.message || 'No se pudo actualizar el estado', 'error');
            }
          });
      }
    });
  }

  marcarComoPendiente(id: number) {
    Swal.fire({
      title: '¿Marcar como pendiente?',
      text: 'Esta venta será marcada como pendiente de pago.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffc107',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, marcar como pendiente',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.patch(`${environment.api.orders}/${id}/estado`, { estado: 'pendiente' })
          .subscribe({
            next: (res: any) => {
              Swal.fire('Actualizado', 'La venta ha sido marcada como pendiente', 'success');
              this.cargarVentasDelDia();
            },
            error: (err) => {
              Swal.fire('Error', err.error.message || 'No se pudo actualizar el estado', 'error');
            }
          });
      }
    });
  }
cancelarVenta(venta: any) { // Pasar el objeto completo
    console.log('=== CANCELAR VENTA ===');
    console.log('Venta object:', venta);
    console.log('Venta object keys:', Object.keys(venta));
    console.log('venta.id:', venta.id);
    console.log('venta.orderId:', venta.orderId);
    console.log('venta.order_id:', venta.order_id);
    const ventaId = venta.id || venta.orderId || venta.order_id;
    console.log('Venta ID final:', ventaId);
    console.log('URL que se llamará:', `${environment.api.orders}/${ventaId}/cancelar`);
    Swal.fire({
      title: '¿Cancelar esta venta?',
      text: `Se cancelará la orden de la Mesa ${venta.mesa || 'Barra'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Sí, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Confirmado, llamando a:', `${environment.api.orders}/${ventaId}/cancelar`);
        this.http.patch(`${environment.api.orders}/${ventaId}/cancelar`, {})
          .subscribe({
            next: (res: any) => {
              console.log('Respuesta exitosa:', res);
              Swal.fire('Cancelada', 'Venta anulada correctamente', 'success');
              this.cargarVentasDelDia();

              // Si tiene mesa asociada (asumiendo que el objeto venta tiene mesaId)
              if (venta.mesaId) {
                this.mesaService.actualizarEstadoMesa(venta.mesaId, 'Libre').subscribe();
              }
            },
            error: (err) => {
              console.error('Error al cancelar venta:', err);
            }
          });
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pagado':
        return 'bg-success';
      case 'pendiente':
        return 'bg-warning text-dark';
      case 'cancelado':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getEstadoIcono(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'pagado':
        return 'bi-check-circle-fill';
      case 'pendiente':
        return 'bi-clock-fill';
      case 'cancelado':
        return 'bi-x-circle-fill';
      default:
        return 'bi-question-circle-fill';
    }
  }

// Función auxiliar para saber qué lista mostrar en la tabla
get ventasParaMostrar() {
  switch (this.activeTab) {
    case 'Pagado': return this.ventasPagadas;
    case 'Cancelado': return this.ventasCanceladas;
    case 'Pendiente':
    default: return this.ventasPendientes;
  }
}
}
