import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { Order } from './mesa.service';
import { environment } from '../../environments/environment';
export interface CreateOrderDto {
  status: string;
  orderType: string;
  paymentMethod: string;
  mesaId: number | "";
  productsIds?: number[];
  propina?: number;
  costo_delivery?:number;
  products?: { id: number; cantidad: number }[];
}

export interface ProductoOrder {
  id: number;
  cantidad: number;
}


export interface CustomerDto {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
}

export interface ProductoMesa {
  id: number;
  name: string;
  price: number;
  quantity?: number;
  orderId: number;
}


export interface CreateSOrderDto {
  tableNumber: number;
  orderType: string;
  status: string;
  propina?: number;
  total: number;
  cantidad: number | undefined;
  createdAt: Date;
  paymentMethod: string;
  customerId?: number; // si es un cliente existente
  newCustomer?: CustomerDto; // si es un cliente nuevo
  productIds?: number[];


}

export interface UpdateOrderDto {
  // Campos básicos de la orden
  tableNumber?: number;       // Número de mesa
  orderType?: string;         // 'local' | 'delivery'
  status?: string;            // 'pendiente' | 'en proceso' | 'cancelado' | etc.

  // Propina
  propinaTipo?: '0' | '5' | '10' | '12' | 'custom';  // Tipo de propina
  propinaValor?: number;                        // Valor si es personalizada (custom)

  // Total final (opcional, el backend lo recalcula)
  total?: number;

  // Campos de fechas (opcional)
  createdAt?: string;          // ISO string o timestamp

  // Métodos de pago
  paymentMethod?: string | null;

  // Relaciones (opcional)
  userId?: number;
  customerId?: number;
  mesaId?: number | null;

  // Detalle de venta
  detalle_venta?: string;

  // Otros campos opcionales
  numeroVenta?: number;
}


@Injectable({
  providedIn: 'root'
})
export class OrdenService {
  private apiUrl = environment.api.orders;
  private apiUrls = `${environment.api.orders}/s`;

  // 🔔 Subject para notificar cambios en las órdenes
  private ordenesActualizadasSubject = new Subject<void>();

  // 🔔 Observable público para que los componentes se suscriban
  public ordenesActualizadas$ = this.ordenesActualizadasSubject.asObservable();

  constructor(private http: HttpClient) { }

  createOrder(order: CreateOrderDto): Observable<any> {
    return this.http.post(this.apiUrl, order).pipe(
      tap(() => {
        console.log('✅ Orden creada, notificando cambios...');
        this.notificarCambioOrdenes();
      })
    );
  }
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createOrders(order: CreateOrderDto): Observable<any> {
    return this.http.post(this.apiUrls, order);
  }

  cancelarOrden(id: number) {
    return this.http.patch(`${this.apiUrl}/${id}/cancelar`, {});
  }

  getVentasPorDia(fecha: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ventas/por-dia?fecha=${fecha}`);
  }

  deleteOrder(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getProductos(mesaId: number): Observable<ProductoMesa[]> {
    return this.http.get<ProductoMesa[]>(`${this.apiUrl}/mesas/${mesaId}/productos`);
  }

  eliminarProducto(orderId: number, productId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${orderId}/productos/${productId}`);
  }

  getHistorialPorMesaYDia(mesaId: number, fecha: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/historial/${mesaId}`);
  }

  getPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pendientes`);
  }

  aceptarVenta(orderId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${orderId}/aceptar`, {}).pipe(
      tap(() => {
        console.log('✅ Venta aceptada, notificando cambios...');
        this.notificarCambioOrdenes();
      })
    );
  }

  pendienteVenta(orderId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${orderId}/pendiente`, {}).pipe(
      tap(() => {
        console.log('✅ Venta pendiente, notificando cambios...');
        this.notificarCambioOrdenes();
      })
    );
  }


  cancelarVenta(orderId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${orderId}/cancelar`, {}).pipe(
      tap(() => {
        console.log('✅ Venta cancelada, notificando cambios...');
        this.notificarCambioOrdenes();
      })
    );
  }

  getVentasDiarias(desde?: string, hasta?: string, orderType?: string) {
    const params: any = {};

    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (orderType) params.orderType = orderType; // 👈 nuevo parámetro

    return this.http.get<any>(`${this.apiUrl}/ventas/diarias`, { params });
  }

  updateOrder(id: number, dto: UpdateOrderDto) {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, dto);
  }

  // ==========================================
  // 🔹 CRUD específico para Mesa
  // ==========================================

  /**
   * Crear una orden para una mesa específica
   * POST /orders/mesa/:mesaId
   */
  crearOrdenPorMesa(mesaId: number, createOrderDto: CreateOrderDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/mesa/${mesaId}`, createOrderDto);
  }

  /**
   * Obtener todas las órdenes de una mesa específica
   * GET /orders/mesa/:mesaId
   * @param mesaId - ID de la mesa
   * @param estado - Estado de las órdenes (opcional)
   * @param fecha - Fecha en formato YYYY-MM-DD (opcional)
   * @param horaInicio - Hora de inicio en formato HH:MM (opcional)
   * @param horaFin - Hora de fin en formato HH:MM (opcional)
   * @param agrupar - Si es true, agrupa todas las órdenes en un solo objeto (opcional)
   */
  obtenerOrdenesPorMesa(
    mesaId: number,
    estado?: string,
    fecha?: string,
    horaInicio?: string,
    horaFin?: string,
    agrupar?: boolean
  ): Observable<any> {
    const params: any = {};
    if (estado) params.estado = estado;
    if (fecha) params.fecha = fecha;
    if (horaInicio) params.horaInicio = horaInicio;
    if (horaFin) params.horaFin = horaFin;
    if (agrupar !== undefined) params.agrupar = agrupar;
    return this.http.get(`${this.apiUrl}/mesa/${mesaId}`, { params });
  }

  /**
   * Obtener una orden específica de una mesa
   * GET /orders/mesa/:mesaId/orden/:ordenId
   */
  obtenerOrdenEspecifica(mesaId: number, ordenId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesa/${mesaId}/orden/${ordenId}`);
  }

  /**
   * Actualizar una orden específica de una mesa
   * PATCH /orders/mesa/:mesaId/orden/:ordenId
   */
  actualizarOrdenPorMesa(mesaId: number, ordenId: number, updateOrderDto: UpdateOrderDto): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mesa/${mesaId}/orden/${ordenId}`, updateOrderDto);
  }

  /**
   * Cancelar un producto específico de una orden (soft delete)
   * PATCH /orders/mesa/:mesaId/orden/:ordenId/producto/:productId/cancelar
   */
  cancelarProducto(mesaId: number, ordenId: number, productId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mesa/${mesaId}/orden/${ordenId}/producto/${productId}/cancelar`, {});
  }

  /**
   * Agregar productos a una orden existente
   * POST /orders/mesa/:mesaId/orden/:ordenId/productos
   */
  agregarProductosAOrden(mesaId: number, ordenId: number, productos: { productId: number, cantidad: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/mesa/${mesaId}/orden/${ordenId}/productos`, { productos });
  }

  /**
   * Notificar a todos los suscriptores que las órdenes han cambiado
   * Útil para sincronización en tiempo real entre componentes
   */
  notificarCambioOrdenes(): void {
    this.ordenesActualizadasSubject.next();
  }

  /**
   * Actualizar detalles de una venta (propina, status, detalle_venta, paymentMethod, productos)
   * PATCH /mesas/ventas/:orderId
   * Coincide exactamente con el endpoint del backend
   *
   * Funcionalidades:
   * ✅ Actualiza productos de la orden (reemplaza todos los productos existentes)
   * ✅ Permite modificar precio unitario de cada producto
   * ✅ Permite modificar cantidad de cada producto
   * ✅ Recalcula automáticamente los subtotales de cada producto
   * ✅ Recalcula el neto (suma de todos los productos)
   * ✅ Recalcula el total (neto + propina)
   * ✅ Notifica cambios por WebSocket
   */
  actualizarDetalleVenta(
    orderId: number,
    updateData: {
      propina?: number;
      status?: string;
      detalle_venta?: string;
      paymentMethod?: string;
      total?: number;
      productos?: Array<{
        productId: number;
        cantidad: number;
        precioUnitario: number;
      }>;
    }
  ): Observable<any> {
    const apiBaseUrl = environment.api.mesas;
    return this.http.patch(`${apiBaseUrl}/ventas/${orderId}`, updateData).pipe(
      tap((updatedOrder: any) => {
        console.log('✅ Detalle de venta actualizado:', updatedOrder);
        console.log('📊 Orden actualizada - ID:', updatedOrder?.id, 'Total:', updatedOrder?.total);
        console.log('🛒 Productos actualizados:', updatedOrder?.orderProducts?.length || 0);
        this.notificarCambioOrdenes();
      })
    );
  }
}
