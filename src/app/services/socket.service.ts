import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Theme } from './models/theme.model';


// src/app/services/socket-events.ts
export interface NewOrderPayload {
  id: number;
  tableNumber: number | null;
  orderType: string;
  status: string;
  mesaId?: number;
  isNew?: boolean;
  // otros campos que necesites
}

export interface MesaUpdatedPayload {
  mesaId: number;
  status: string;
}

export interface JoinRoomPayload {
  role: 'mesero' | 'admin';
}

export interface ServerToClientEvents {
  newOrder: (order: NewOrderPayload) => void;
  orderStatusUpdated: (order: NewOrderPayload) => void;
  mesaStatusUpdated: (data: MesaUpdatedPayload) => void;
}

export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload) => void;
}



@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket: Socket;

  constructor() {
    // ✅ Ajusta la URL a tu backend en producción
    this.socket = io('https://espacioboulevard.com', {
      transports: ['websocket', 'polling'],
      secure: true,
    });
    this.socket.on('printTicket', (data: any) => {
      this.imprimirTicket(data);
    });

  }


  onThemeUpdates(): Observable<Theme> {
    return new Observable(sub => {
      this.socket.on('themeUpdated', (t: Theme) => sub.next(t));
      return () => this.socket.off('themeUpdated');
    });
  }


  // ✅ Escuchar evento de nuevos pedidos
  onNewOrder(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newOrder', order => {
        console.log('🔔 WebSocket: newOrder recibido', order);
        observer.next(order);
      });
      return () => this.socket.off('newOrder');
    });
  }

  onOrderUpdated(): Observable<any> {
    return new Observable(sub => {
      this.socket.on('orderStatusUpdated', (data: any) => sub.next(data));
      return () => this.socket.off('orderStatusUpdated');
    });
  }

  onMesaUpdated(): Observable<any> {
    return new Observable(sub => {
      this.socket.on('mesaStatusUpdated', (data: any) => sub.next(data));
      return () => this.socket.off('mesaStatusUpdated');
    });
  }

  // ✅ Escuchar evento de órdenes de mesa actualizadas (con datos agrupados)
  onMesaOrdenesUpdated(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('mesaOrdenesUpdated', (data: any) => {
        console.log('🔔 WebSocket: mesaOrdenesUpdated recibido', data);
        observer.next(data);
      });
      return () => this.socket.off('mesaOrdenesUpdated');
    });
  }

  // -----------------------------------------------------
  // 🧾 FUNCIÓN PRINCIPAL DE IMPRESIÓN
  // -----------------------------------------------------
  imprimirTicket(data: any) {
    const htmlCaja = this.generarTicketCaja(data);
    const htmlCocina = this.generarTicketCocina(data);

    // Imprimir ambos (con leve retraso entre uno y otro)
    this.imprimirSilencioso(htmlCaja);
    setTimeout(() => this.imprimirSilencioso(htmlCocina), 800);
  }

  // -----------------------------------------------------
  // 🪄 GENERAR HTML DE TICKET PARA CAJA
  // -----------------------------------------------------
  private generarTicketCaja(ticket: any): string {
    return `
    <html>
      <head>
        <title>Ticket Caja</title>
        <style>${this.estilosTicket()}</style>
      </head>
      <body>
        <div class="ticket">
          <div class="centrado">
            <h3>ESPACIO BOULEVARD</h3>
            <p><strong>Mesa:</strong> ${ticket.mesa}</p>
            <hr>
          </div>
          <div class="productos">
            ${ticket.productos.map((p: any) => `
              <div class="producto">
                <span>${p.cantidad} x ${p.nombre}</span>
                <span>$${p.precio}</span>
              </div>
            `).join('')}
          </div>
          <hr>
          <div class="centrado">
            <strong>Total: $${ticket.total}</strong>
          </div>
          <div class="footer centrado">
            <p>Gracias por su compra</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>`;
  }

  // -----------------------------------------------------
  // 🍳 GENERAR HTML DE TICKET PARA COCINA
  // -----------------------------------------------------
  private generarTicketCocina(ticket: any): string {
    return `
    <html>
      <head>
        <title>Ticket Cocina</title>
        <style>${this.estilosTicket()}</style>
      </head>
      <body>
        <div class="ticket cocina">
          <div class="centrado encabezado-cocina">
            <h3>ORDEN DE COCINA</h3>
            <p><strong>Mesa:</strong> ${ticket.mesa}</p>
            <hr>
          </div>
          <div class="productos">
            ${ticket.productos.map((p: any) => `
              <div class="producto">
                <span>${p.cantidad} x ${p.nombre}</span>
              </div>
            `).join('')}
          </div>
          <hr>
          <div class="centrado">
            <p><em>Preparar de inmediato</em></p>
          </div>
        </div>
      </body>
    </html>`;
  }

  // -----------------------------------------------------
  // 🖨️ IMPRIMIR DE MANERA SILENCIOSA EN CHROME
  // -----------------------------------------------------
  private imprimirSilencioso(html: string) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print(); // Chrome con --kiosk-printing imprime directo
      document.body.removeChild(iframe);
    }, 500);
  }

  // -----------------------------------------------------
  // 🧱 ESTILOS DE LOS TICKETS (CSS)
  // -----------------------------------------------------
  private estilosTicket(): string {
    return `
      @media print {
        @page { size: auto; margin: 4mm; }
        body {
          font-family: 'Courier New', monospace;
          color: #000;
          font-size: 12px;
          margin: 0;
        }
        .ticket {
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
        }
        .centrado { text-align: center; }
        h3 {
          margin: 0;
          font-size: 1.2em;
          font-weight: bold;
          text-transform: uppercase;
        }
        hr {
          border: none;
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .producto {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .encabezado-cocina h3 {
          background: #000;
          color: #fff;
          padding: 4px 0;
        }
        .footer {
          margin-top: 6px;
          font-size: 11px;
        }
      }`;
  }
}


