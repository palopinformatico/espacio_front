import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticket-cocina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-cocina.component.html',
  styleUrl: './ticket-cocina.component.css'
})
export class TicketCocinaComponent {
  @Input() pedido: any;

  get fecha(): string {
    return new Date(this.pedido?.createdAt).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get hora(): string {
    // Usar hora actual en lugar de la hora del pedido
    return new Date().toLocaleString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  get mesa(): string {
    return this.pedido?.mesa?.numero_mesa || this.pedido?.tableNumber || 'DELIVERY';
  }
}
