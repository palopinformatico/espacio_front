import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticket-caja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-caja.component.html',
  styleUrl: './ticket-caja.component.css'
})
export class TicketCajaComponent {
  @Input() pedido: any;

  get fecha(): string {
    // Usar fecha y hora actual en lugar de la hora del pedido
    return new Date().toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  get mesa(): string {
    return this.pedido?.mesa?.numero_mesa || this.pedido?.tableNumber || 'Delivery';
  }

  get subtotal(): number {
    return (this.pedido?.total || 0) - (this.pedido?.propina || 0);
  }

  formatPrice(value: number): string {
    if (value == null) return '$0';
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
