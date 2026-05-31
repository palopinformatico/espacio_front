import { Injectable, ComponentRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TicketCajaComponent } from '../components/ticket-caja/ticket-caja.component';
import { TicketCocinaComponent } from '../components/ticket-cocina/ticket-cocina.component';

@Injectable({ providedIn: 'root' })
export class PrintService {
  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  /**
   * Imprime el ticket de caja (boleta completa con precios)
   */
  async generarTicketCaja(pedido: any): Promise<void> {
    const pedidoNormalizado = this.normalizarPedido(pedido);
    return this.imprimirTicket(TicketCajaComponent, pedidoNormalizado, 'ticketCaja');
  }

  /**
   * Imprime el ticket de cocina (solo productos sin precios)
   */
  async generarTicketCocina(pedido: any): Promise<void> {
    const pedidoNormalizado = this.normalizarPedido(pedido);
    return this.imprimirTicket(TicketCocinaComponent, pedidoNormalizado, 'ticketCocina');
  }

  /**
   * Normaliza la estructura del pedido para asegurar consistencia
   */
  private normalizarPedido(pedido: any): any {
    if (!pedido) return pedido;

    console.log('📦 Pedido original:', pedido);
    console.log('📝 Comentarios originales:', pedido.detalle_venta);

    // Crear copia del pedido
    const pedidoNormalizado = { ...pedido };

    // Si existe 'items' pero no 'orderProducts', convertir la estructura
    if (pedido.items && !pedido.orderProducts) {
      pedidoNormalizado.orderProducts = pedido.items.map((item: any) => ({
        cantidad: item.cantidad || item.quantity || 1,
        precioUnitario: item.price || item.precioUnitario || 0,
        subtotal: item.subtotal || (item.price * item.cantidad) || 0,
        product: {
          name: item.name || item.producto || item.productName || 'Producto sin nombre',
          price: item.price || item.precioUnitario || 0
        }
      }));
    }

    // Si existe 'orderProducts', asegurar que tenga la estructura correcta
    if (pedidoNormalizado.orderProducts) {
      pedidoNormalizado.orderProducts = pedidoNormalizado.orderProducts.map((item: any) => ({
        cantidad: item.cantidad || item.quantity || 1,
        precioUnitario: item.precioUnitario || item.product?.price || 0,
        subtotal: item.subtotal || 0,
        product: {
          name: item.product?.name || item.name || item.producto || item.productName || 'Producto sin nombre',
          price: item.product?.price || item.precioUnitario || item.price || 0
        }
      }));
    }

    // ✅ Asegurar que detalle_venta se preserve (puede ser null o string)
    pedidoNormalizado.detalle_venta = pedido.detalle_venta !== undefined ? pedido.detalle_venta : null;

    console.log('✅ Pedido normalizado:', pedidoNormalizado);
    console.log('📋 Productos a imprimir:', pedidoNormalizado.orderProducts);
    console.log('📝 Comentarios finales:', pedidoNormalizado.detalle_venta);
    if (!pedidoNormalizado.detalle_venta) {
      console.warn('⚠️ Sin comentarios en este pedido');
    }

    return pedidoNormalizado;
  }

  /**
   * Método genérico para imprimir un ticket usando window.print()
   */
  private async imprimirTicket(
    componentType: any,
    pedido: any,
    printSectionId: string
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      // Crear el componente dinámicamente
      const componentRef = createComponent(componentType, {
        environmentInjector: this.injector
      });

      // Asignar el pedido al componente
      (componentRef.instance as any).pedido = pedido;

      // Detectar cambios
      componentRef.changeDetectorRef.detectChanges();

      // Obtener el elemento HTML del componente
      const ticketElement = componentRef.location.nativeElement;

      // Crear ventana nueva para impresión
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        console.error('No se pudo abrir la ventana de impresión');
        componentRef.destroy();
        resolve();
        return;
      }

      // Escribir el contenido en la nueva ventana (optimizado para impresoras térmicas)
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=80mm, initial-scale=1.0">
            <title>Ticket - Boulevard Linares</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body {
                width: 80mm;
                margin: 0 auto;
                padding: 0;
                background: white;
              }
            </style>
            ${this.getPrintStyles()}
          </head>
          <body>
            ${ticketElement.outerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Esperar a que se cargue todo
      printWindow.onload = () => {
        // Imprimir automáticamente sin espera
        // El navegador mostrará el diálogo de impresión automáticamente
        printWindow.print();

        // Cerrar ventana después de que se cierre el diálogo de impresión
        // El evento afterprint se dispara cuando el usuario acepta o cancela
        printWindow.onafterprint = () => {
          printWindow.close();
          componentRef.destroy();
          resolve();
        };

        // Fallback: cerrar después de 2 segundos si el evento no se dispara
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
            componentRef.destroy();
            resolve();
          }
        }, 2000);
      };
    });
  }

  /**
   * Obtiene los estilos necesarios para la impresión
   */
  private getPrintStyles(): string {
    return `
      <style>
        /* ============================================
           ESTILOS TICKET DE CAJA
           ============================================ */
        .ticket-caja {
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 5mm;
          font-family: 'Courier New', monospace;
          background: white;
          color: #000;
          font-size: 10pt;
        }

        .ticket-header {
          text-align: center;
          margin-bottom: 8mm;
        }

        .logo-section {
          margin-bottom: 3mm;
        }

        .ticket-logo {
          width: 40mm;
          height: auto;
          object-fit: contain;
        }

        .business-name {
          font-size: 16pt;
          font-weight: bold;
          margin: 2mm 0;
          text-transform: uppercase;
          letter-spacing: 0.5mm;
        }

        .business-info {
          font-size: 9pt;
          margin: 1mm 0;
          color: #333;
        }

        .divider {
          border-top: 2px dashed #000;
          margin: 4mm 0;
        }

        .divider-thin {
          border-top: 1px solid #000;
          margin: 2mm 0;
        }

        .ticket-info {
          margin-bottom: 4mm;
        }

        .ticket-title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 3mm;
          text-transform: uppercase;
          letter-spacing: 0.3mm;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 1.5mm 0;
          font-size: 10pt;
        }

        .info-row .label {
          font-weight: bold;
        }

        .products-section {
          margin: 4mm 0;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }

        .products-table thead tr {
          border-bottom: 1px solid #000;
        }

        .products-table th {
          padding: 2mm 0;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 8pt;
        }

        .products-table tbody tr {
          border-bottom: 1px dotted #999;
        }

        .products-table td {
          padding: 2mm 0;
          vertical-align: top;
        }

        .product-name {
          font-weight: 500;
        }

        .price {
          font-weight: bold;
        }

        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .totals-section {
          margin: 4mm 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 1.5mm 0;
          font-size: 11pt;
        }

        .total-row.grand-total {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 3mm;
        }

        .total-row .label {
          font-weight: 600;
        }

        .total-row .value {
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .footer-section {
          text-align: center;
          margin-top: 6mm;
        }

        .thank-you {
          font-size: 12pt;
          font-weight: bold;
          margin: 2mm 0;
          text-transform: uppercase;
        }

        .footer-info {
          font-size: 9pt;
          color: #666;
          margin: 1mm 0;
        }

        /* ============================================
           ESTILOS TICKET DE COCINA
           ============================================ */
        .ticket-cocina {
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 5mm;
          font-family: 'Arial', 'Helvetica', sans-serif;
          background: white;
          color: #000;
          font-size: 12pt;
          font-weight: 500;
        }

        .badge-cocina {
          background: #000;
          color: white;
          padding: 3mm 0;
          font-size: 18pt;
          font-weight: bold;
          letter-spacing: 2mm;
          margin-bottom: 4mm;
          border-radius: 2mm;
        }

        .mesa-numero {
          font-size: 22pt;
          font-weight: bold;
          margin: 3mm 0;
          padding: 3mm;
          background: #f0f0f0;
          border: 2px solid #000;
          border-radius: 2mm;
          letter-spacing: 1mm;
        }

        .pedido-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 3mm;
          font-size: 11pt;
          font-weight: 600;
        }

        .pedido-num {
          color: #333;
        }

        .hora {
          background: #000;
          color: white;
          padding: 1mm 3mm;
          border-radius: 2mm;
          font-weight: bold;
        }

        .divider-thick {
          border-top: 3px double #000;
          margin: 5mm 0;
        }

        .productos-section {
          margin: 5mm 0;
        }

        .productos-title {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 4mm;
          letter-spacing: 0.5mm;
          border-bottom: 2px solid #000;
          padding-bottom: 2mm;
        }

        .productos-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13pt;
        }

        .productos-table thead tr {
          background: #e0e0e0;
          border: 2px solid #000;
        }

        .productos-table th {
          padding: 2.5mm;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 11pt;
          border-bottom: 2px solid #000;
        }

        .productos-table tbody tr {
          border-bottom: 1px solid #ddd;
          min-height: 10mm;
        }

        .productos-table tbody tr.alt-row {
          background: #f9f9f9;
        }

        .productos-table td {
          padding: 3mm 2mm;
          vertical-align: middle;
        }

        .producto-nombre {
          font-weight: 600;
          font-size: 14pt;
          line-height: 1.4;
        }

        .bullet {
          font-size: 16pt;
          margin-right: 2mm;
          font-weight: bold;
        }

        .cantidad-badge {
          text-align: center;
          width: 20mm;
        }

        .cantidad-badge .badge {
          background: #000;
          color: white;
          padding: 2mm 4mm;
          border-radius: 2mm;
          font-weight: bold;
          font-size: 15pt;
          display: inline-block;
          min-width: 15mm;
          text-align: center;
        }

        .notas-section {
          margin: 5mm 0;
          padding: 3mm;
          background: #fff9e6;
          border: 2px dashed #ffa500;
          border-radius: 2mm;
        }

        .notas-title {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 2mm;
          color: #ff6600;
        }

        .notas-content {
          font-size: 13pt;
          font-weight: 600;
          line-height: 1.5;
          color: #000;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .timestamp {
          font-size: 10pt;
          color: #666;
          margin-bottom: 3mm;
        }

        .prioridad-badge {
          margin-top: 3mm;
        }

        .badge-alta {
          display: inline-block;
          background: #ff3333;
          color: white;
          padding: 2mm 4mm;
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5mm;
          border-radius: 2mm;
        }

        /* ============================================
           ESTILOS DE IMPRESIÓN TÉRMICA
           ============================================ */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            height: auto !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .ticket-caja,
          .ticket-cocina {
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 3mm !important;
            margin: 0 !important;
            page-break-after: auto;
            box-shadow: none !important;
          }

          /* Asegurar que todos los fondos negros se impriman */
          .badge-cocina,
          .hora,
          .cantidad-badge .badge {
            background: #000 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Asegurar que los bordes se impriman */
          .mesa-numero,
          .productos-table th,
          .divider,
          .divider-thick {
            border-color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Sección de notas para impresión */
          .notas-section {
            background: #f5f5f5 !important;
            border: 2px dashed #999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .badge-alta {
            background: #000 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        body {
          margin: 0;
          padding: 0;
        }
      </style>
    `;
  }

  /**
   * Formatea precio en formato chileno
   */
  formatPrecio(valor: number): string {
    return '$' + valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
