import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Mesa, MesaService, Order } from '../services/mesa.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenService, CreateOrderDto } from '../services/orden.service';
import { ProductService, ProductDto } from '../services/product.service';
import { CategoriaService, Category } from '../services/categoria.service';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';
import Swal from 'sweetalert2';

// Interfaces for type safety
interface CarritoProduct {
  id: number;
  name: string;
  cantidad: number;
  price: number;
  subtotal: number;
  imageUrl?: string;
}

interface CarritoItem {
  orderId: number;
  numeroVenta: string | null;
  orderType: string | null;
  detalle_venta: string | null;
  total: number;
  propina: number;
  neto: number;
  products: CarritoProduct[];
}

interface HistorialPedido {
  id?: number;
  status?: string;
  totalPedido?: number;
  numeroVenta?: string | number;
  createdAt?: string;
  products?: CarritoProduct[]; // Array de productos del pedido
  [key: string]: unknown; // Para permitir propiedades adicionales del backend
}

@Component({
  selector: 'app-mesa-detalle',
  templateUrl: './mesa-detalle.component.html',
  standalone: true,
  providers: [DecimalPipe],
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent],
  styleUrls: ['./mesa-detalle.component.css']
})
export class MesaDetalleComponent implements OnInit, OnDestroy {



  private destroy$ = new Subject<void>();
  private updatingQuantity = false; // Flag para prevenir recargas durante actualizaciones

  mesaId!: number;
  detalleMesa!: string;
  mesa!: Mesa;
  fechas: string | undefined;
  historialPedidos: HistorialPedido[] = [];
  carrito: CarritoItem[] = [];
  pedidos: Order[] = [];
  detalle = '';  // Para el mensaje extra
  propinaPercent = 0.1; // 10% propina sugerida
  numeroVenta = 0;

  // Product modal properties
  productos: ProductDto[] = [];
  categorias: Category[] = [];
  selectedCategoryId: number | null = null;
  searchTerm = '';
  filteredProducts: ProductDto[] = [];
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private mesasService: MesaService,
    private ordersService: OrdenService,
    private decimalPipe: DecimalPipe,
    private productService: ProductService,
    private categoriaService: CategoriaService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('id')!;
    this.fechas = this.getTodayDate();

    this.cargarMesa();
    this.cargarDetalleMesaConCarrito(); // Cargar órdenes actuales
    this.obtenerHistorialDelDia();

    // 🔧 Helper para comparación case-insensitive de estado de mesa
    const isMesaLibre = () => this.mesa && this.mesa.status?.toLowerCase() === 'libre';

    // 🔔 Suscribirse a cambios de órdenes para sincronización automática (RxJS)
    this.ordersService.ordenesActualizadas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // 🔒 No recargar si estamos actualizando cantidad
        if (this.updatingQuantity) {
          console.log('⏸️ Recarga pausada: actualizando cantidad...');
          return;
        }

        console.log('🔄 Mesa-Detalle: Recargando datos por cambio en órdenes (RxJS)...');
        // 🔹 IMPORTANTE: Primero cargar la mesa para actualizar el status, luego los pedidos
        this.cargarMesa(() => {
          // 🔓 Solo cargar detalles si la mesa NO está libre (case-insensitive)
          if (this.mesa && this.mesa.status?.toLowerCase() !== 'libre') {
            this.cargarDetalleMesaConCarrito();
          } else {
            // Si la mesa está libre, limpiar el carrito
            console.log('🔓 Mesa libre detectada, limpiando carrito');
            this.carrito = [];
            this.cdr.detectChanges();
          }
          this.obtenerHistorialDelDia();
        });
      });

    // 🔔 Suscribirse a WebSocket para actualizaciones en tiempo real
    console.log('📡 Mesa-Detalle: Suscribiéndose a WebSocket newOrder...');
    console.log('📍 Mesa actual ID:', this.mesaId);
    this.socketService.onNewOrder()
      .pipe(takeUntil(this.destroy$))
      .subscribe((order) => {
        console.log('🆕 Mesa-Detalle: Nuevo pedido recibido via WebSocket', order);
        console.log('🔍 Comparando mesaId - WebSocket:', order.mesaId, 'vs Componente:', this.mesaId, 'Coincide:', order.mesaId === this.mesaId);
        // Si el pedido es de esta mesa, recargar
        if (order.mesaId === this.mesaId) {
          console.log('✅ El pedido es de esta mesa, recargando...');
          // 🔹 IMPORTANTE: Primero cargar la mesa para tener estado actualizado
          this.cargarMesa(() => {
            if (this.mesa && this.mesa.status?.toLowerCase() !== 'libre') {
              this.cargarDetalleMesaConCarrito();
            } else {
              console.log('🔓 Mesa libre detectada, limpiando carrito');
              this.carrito = [];
              this.cdr.detectChanges();
            }
            this.obtenerHistorialDelDia();
          });
        }
      });

    console.log('📡 Mesa-Detalle: Suscribiéndose a WebSocket orderUpdated...');
    this.socketService.onOrderUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((order) => {
        // 🔒 No recargar si estamos actualizando cantidad
        if (this.updatingQuantity) {
          console.log('⏸️ Recarga pausada: actualizando cantidad...');
          return;
        }

        console.log('🔄 Mesa-Detalle: Pedido actualizado via WebSocket', order);
        // Si el pedido es de esta mesa, recargar
        if (order.mesaId === this.mesaId) {
          console.log('✅ El pedido actualizado es de esta mesa, recargando...');
          // 🔹 IMPORTANTE: Primero cargar la mesa para tener estado actualizado
          this.cargarMesa(() => {
            if (this.mesa && this.mesa.status?.toLowerCase() !== 'libre') {
              this.cargarDetalleMesaConCarrito();
            } else {
              console.log('🔓 Mesa libre detectada, limpiando carrito');
              this.carrito = [];
              this.cdr.detectChanges();
            }
            this.obtenerHistorialDelDia();
          });
        }
      });

    console.log('📡 Mesa-Detalle: Suscribiéndose a WebSocket mesaUpdated...');
    this.socketService.onMesaUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🏠 Mesa-Detalle: Mesa actualizada via WebSocket', data);
        // Si es esta mesa, recargar todo
        if (data.mesaId === this.mesaId) {
          console.log('✅ Esta mesa fue actualizada, recargando...');
          // 🔹 IMPORTANTE: Primero cargar la mesa, luego verificar estado
          this.cargarMesa(() => {
            if (this.mesa && this.mesa.status?.toLowerCase() !== 'libre') {
              this.cargarDetalleMesaConCarrito();
            } else {
              console.log('🔓 Mesa libre detectada, limpiando carrito');
              this.carrito = [];
              this.cdr.detectChanges();
            }
            this.obtenerHistorialDelDia();
          });
        }
      });

    // 🔔 Escuchar evento específico de órdenes de mesa actualizadas (datos agrupados)
    console.log('📡 Mesa-Detalle: Suscribiéndose a WebSocket mesaOrdenesUpdated...');
    console.log('📍 Mesa actual ID:', this.mesaId);
    this.socketService.onMesaOrdenesUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        console.log('📦 Mesa-Detalle: Órdenes de mesa actualizadas via WebSocket', response);
        console.log('🔍 Comparando mesaId - WebSocket:', response.mesaId, 'vs Componente:', this.mesaId, 'Coincide:', response.mesaId === this.mesaId);

        // Si es esta mesa, actualizar directamente el carrito con los datos recibidos
        if (response.mesaId === this.mesaId) {
          console.log('✅ Actualizando carrito con datos del WebSocket...');

          // El WebSocket envía los datos en response.ordenes
          const ordenesData = response.ordenes || response;
          const detalleProductos = ordenesData.detalle || [];

          console.log('📋 Detalle productos recibidos:', detalleProductos);

          // Actualizar carrito directamente con los datos agrupados del WebSocket
          if (detalleProductos.length > 0) {
            this.carrito = [{
              orderId: ordenesData.orderIds?.[0] || 0,
              numeroVenta: ordenesData.orderIds?.join(', ') || '',
              orderType: ordenesData.orderType || 'local',
              detalle_venta: null,
              total: ordenesData.totalMesa || 0,
              propina: ordenesData.propina || 0,
              neto: ordenesData.neto || 0,
              products: detalleProductos.map((prod: any) => ({
                id: prod.id,
                name: prod.nombre,
                cantidad: prod.cantidad,
                price: prod.precioUnitario,
                subtotal: prod.subtotal,
                imageUrl: prod.imageUrl || '/logo.png'
              }))
            }];
            console.log('✅ Carrito actualizado desde WebSocket:', this.carrito);
            // 🔄 Forzar detección de cambios de Angular
            this.cdr.detectChanges();
          } else {
            this.carrito = [];
            console.log('⚠️ No hay órdenes en el WebSocket, limpiando carrito');
            // 🔄 Forzar detección de cambios de Angular
            this.cdr.detectChanges();
          }
        } else {
          console.log('❌ Mesa no coincide - No se actualiza el carrito');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarMesa(onComplete?: () => void) {
    this.mesasService.getMesa(this.mesaId).subscribe({
      next: (mesa) => {
        this.mesa = mesa;
        this.carrito = [];
        this.pedidos = [];
        this.numeroVenta = 0;
        this.cdr.detectChanges();

        // Ejecutar callback si existe (para encadenar operaciones)
        if (onComplete) {
          onComplete();
        }
      },
      error: (err) => console.error(err),
    });
  }



  // 📦 Cargar detalle de la mesa con carrito (UN SOLO ENDPOINT)
  cargarDetalleMesaConCarrito() {
    // ⛔ Si la mesa está libre, no cargar órdenes y limpiar el carrito
    if (this.mesa && this.mesa.status?.toLowerCase() === 'libre') {
      console.log('🔓 Mesa está libre, limpiando carrito');
      this.carrito = [];
      this.cdr.detectChanges();
      return;
    }

    // 🎯 El backend filtra por estado 'pendiente', fecha actual y agrupa las órdenes
    this.ordersService.obtenerOrdenesPorMesa(
      this.mesaId,
      'pendiente',  // Estado: solo órdenes pendientes
      undefined,  // Fecha: día actual (YYYY-MM-DD)
      undefined,    // horaInicio
      undefined,    // horaFin
      true          // agrupar: true para obtener formato agrupado
    ).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta agrupada del backend:', response);

        // El backend retorna un objeto agrupado con formato:
        // { mesaId, mesa, orderIds, detalle, neto, propina, totalMesa }
        if (response && response.detalle && response.detalle.length > 0) {
          this.carrito = [{
            orderId: response.orderIds?.[0] || 0,  // Usar el primer ID de las órdenes agrupadas
            numeroVenta: response.orderIds?.join(', ') || '',  // Mostrar todos los IDs
            orderType: 'local',
            detalle_venta: null,
            total: response.totalMesa || 0,
            propina: response.propina || 0,
            neto: response.neto || 0,
            // Mapear los productos del campo 'detalle'
            products: (response.detalle || []).map((prod: any) => ({
              id: prod.id,
              name: prod.nombre,
              cantidad: prod.cantidad,
              price: prod.precioUnitario,
              subtotal: prod.subtotal,
              imageUrl: prod.imageUrl || '/logo.png'
            }))
          }];

          console.log('✅ Carrito cargado (agrupado):', this.carrito);
          // 🔄 Forzar detección de cambios de Angular
          this.cdr.detectChanges();
        } else {
          // No hay órdenes, limpiar carrito
          this.carrito = [];
          console.log('⚠️ No hay órdenes pendientes para esta mesa');
          // 🔄 Forzar detección de cambios de Angular
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('❌ Error cargando órdenes:', err)
    });
  }

  getSubtotal(): number {
    if (!Array.isArray(this.carrito)) return 0;

    return this.carrito.reduce((totalPedido, order) => {
      const productosTotal = (order.products || []).reduce((sum: number, p: { subtotal: any; }) => {
        return sum + (Number(p.subtotal) || 0);
      }, 0);
      return totalPedido + productosTotal;
    }, 0);
  }

  // Calcula la propina como 10% del subtotal
  getPropina(): number {
    const subtotal = this.getSubtotal();
    return Math.round(subtotal * 0.1);
  }

  // Total de la mesa
  getTotal(): number {
    return this.getSubtotal() + this.getPropina();
  }


  actualizarCantidad(orderId: number, productId: number, delta: number) {
    const order = this.carrito.find(o => o.orderId === orderId);
    if (order) {
      const product = order.products.find((p: any) => p.id === productId);
      if (product) {
        const newQuantity = product.cantidad + delta;
        if (newQuantity > 0) {
          // 🔒 Activar bandera para prevenir recargas automáticas
          this.updatingQuantity = true;

          // Actualizar localmente para feedback inmediato
          product.cantidad = newQuantity;
          product.subtotal = product.cantidad * product.price;
          order.total = order.products.reduce((sum: number, p: any) => sum + p.subtotal, 0);
          this.cdr.detectChanges();

          // Guardar en backend
          this.ordersService.agregarProductosAOrden(this.mesaId, orderId, [{
            productId: productId,
            cantidad: newQuantity
          }]).subscribe({
            next: (response) => {
              console.log('✅ Cantidad actualizada en backend:', response);
              // ✅ NO recargar - la actualización local ya es suficiente
              // Desactivar bandera después de un pequeño delay
              setTimeout(() => {
                this.updatingQuantity = false;
              }, 1000); // 1 segundo de buffer
            },
            error: (err) => {
              console.error('❌ Error actualizando cantidad:', err);
              this.updatingQuantity = false; // Desactivar bandera
              // Solo recargar en caso de error para restaurar estado correcto
              this.cargarDetalleMesaConCarrito();
            }
          });
        } else if (newQuantity === 0) {
          // Si la cantidad llega a 0, eliminar el producto
          this.onEliminarProducto(orderId, productId);
        }
      }
    }
  }

  aceptarPedido() {
    // Aquí pones la lógica para marcar el pedido como aceptado
    console.log('Pedido aceptado', this.carrito);
  }





  // Marcar mesa como pagada
  marcarComoPagado() {
    // Validación del ID de mesa
    const idParsed = Number(this.mesaId);
    if (!idParsed || isNaN(idParsed)) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: '🚫 ID de mesa inválido: ' + this.mesaId,
      });
      alert('Error: ID de mesa inválido');
      return;
    }

    // Verificar que hay órdenes para pagar
    if (!this.carrito || this.carrito.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin pedidos',
        text: 'No hay pedidos pendientes para pagar',
      });
      alert('No hay pedidos pendientes para pagar');
      return;
    }

    const total = this.formatPrice(this.getTotal());

    // Confirmar acción con Swal modal
    Swal.fire({
      icon: 'question',
      title: '¿Confirmar pago?',
      text: `¿Confirmar pago de ${total} y liberar la mesa?`,
      confirmButtonText: 'Confirmar pago',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
    }).then((result) => {
      if (!result.isConfirmed) return;

      // Llamar al servicio backend
      this.mesasService.marcarPedidoPagado(idParsed).subscribe({
        next: () => {
          console.log('✅ Mesa liberada y pedidos pagados');
          Swal.fire({
            icon: 'success',
            title: 'Notificación de éxito',
            text: '¡Pago registrado! Mesa liberada exitosamente',
            timer: 1500,
            showConfirmButton: false,
          });
          this.showToast('¡Pago registrado! Mesa liberada exitosamente');

          // Notificar cambios para sincronización con otros componentes
          this.ordersService.notificarCambioOrdenes();

          // Recargar datos
          this.cargarMesa();
          this.cargarDetalleMesaConCarrito();
          this.obtenerHistorialDelDia();
        },
        error: (err) => {
          console.error('❌ Error al marcar como pagado:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al procesar el pago. Por favor intenta nuevamente.',
          });
          alert('Error al procesar el pago. Por favor intenta nuevamente.');
        },
      });
    });
  }


  onEliminarProducto(orderId: number, productId: number) {
    console.log('Eliminando producto...', orderId, productId);

    // 🔒 Activar bandera para prevenir recargas automáticas
    this.updatingQuantity = true;

    this.ordersService.cancelarProducto(this.mesaId, orderId, productId).subscribe({
      next: (res) => {
        console.log('Eliminado ✅', orderId, productId);

        // ✅ Actualizar localmente en lugar de recargar todo
        const order = this.carrito.find(o => o.orderId === orderId);
        if (order) {
          // Eliminar el producto del array de products
          order.products = order.products.filter((p: any) => p.id !== productId);

          // Si no quedan productos en la orden, eliminar la orden completa del carrito
          if (order.products.length === 0) {
            this.carrito = this.carrito.filter(o => o.orderId !== orderId);

            // 🔓 Si no quedan órdenes en el carrito, liberar la mesa
            if (this.carrito.length === 0) {
              console.log('🔓 Último producto eliminado, liberando mesa...');
              this.mesasService.actualizarEstadoMesa(this.mesaId, 'Libre').subscribe({
                next: () => {
                  console.log('✅ Mesa liberada');
                  this.mesa.status = 'Libre'; // Actualizar estado local
                  this.cdr.detectChanges();
                },
                error: (err) => console.error('Error liberando mesa:', err)
              });
            }
          } else {
            // Recalcular el total de la orden
            order.total = order.products.reduce((sum: number, p: any) => sum + p.subtotal, 0);
          }
          this.cdr.detectChanges();
        }

        // Desactivar bandera después de un delay
        setTimeout(() => {
          this.updatingQuantity = false;
        }, 1000);
      },
      error: (err) => {
        console.error('Error al eliminar', err);
        this.updatingQuantity = false; // Desactivar bandera
        this.cargarDetalleMesaConCarrito(); // Solo recargar en error
      },
    });
  }

  seguirPedido() {
    const userRole = this.authService.getUserRole();
    const targetRoute = userRole === 'admin' ? '/admin' : '/garzon';
    this.router.navigate([targetRoute]);
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    // convierte el número a string con separador de miles
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  volverAMesas(): void {
    const userRole = this.authService.getUserRole();
    const targetRoute = userRole === 'admin' ? '/admin' : '/garzon';
    this.router.navigate([targetRoute]);
  }

  obtenerHistorialDelDia() {
    const fechaHoy = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
    this.ordersService.getHistorialPorMesaYDia(this.mesaId, fechaHoy).subscribe({
      next: (data) => {
        console.log('🔍 DATOS RAW del backend:', data);

        // Filtrar solo los pedidos que estén pagados (sin filtro de fecha)
        this.historialPedidos = data.filter(order => {
          const estaPagado = order.status?.toLowerCase() === 'pagado';
          return estaPagado;
        });

        console.log('📦 Historial filtrado (solo pagados):', this.historialPedidos);
      },
      error: (err) => console.error('Error al obtener historial:', err),
    });
  }

  // Calcular total del historial del día
  getTotalHistorial(): number {
    return this.historialPedidos.reduce((total, order) => {
      return total + (Number(order.totalPedido) || 0);
    }, 0);
  }

  getTodayDate(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0]; // ➜ YYYY-MM-DD ✅
  }

  abrirModalForzado() {
    console.log('🔄 Abriendo modal forzado...');

    // Cerrar cualquier modal existente primero
    const existingModal = document.getElementById('productModal');
    if (existingModal) {
      const modalInstance = (window as any).bootstrap.Modal.getInstance(existingModal);
      if (modalInstance) {
        modalInstance.dispose();
      }
    }

    // Forzar la eliminación de cualquier backdrop existente
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());

    // Remover clases del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Crear y mostrar el modal manualmente
    setTimeout(() => {
      const modalElement = document.getElementById('productModal');
      if (modalElement) {
        // Asegurar que el modal sea visible
        modalElement.style.display = 'block';
        modalElement.style.visibility = 'visible';
        modalElement.style.opacity = '1';
        modalElement.classList.add('show');
        modalElement.style.zIndex = '1055';

        // Añadir backdrop manualmente
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.style.zIndex = '1050';
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100%';
        backdrop.style.height = '100%';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        document.body.appendChild(backdrop);

        // Añadir clases al body
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';

        // Asegurar que el modal-dialog sea visible
        const modalDialog = modalElement.querySelector('.modal-dialog') as HTMLElement;
        if (modalDialog) {
          modalDialog.style.display = 'block';
          modalDialog.style.visibility = 'visible';
          modalDialog.style.opacity = '1';
          modalDialog.style.zIndex = '1056';
          modalDialog.style.position = 'relative';
        }

        // Forzar detección de cambios de Angular
        setTimeout(() => {
          const event = new Event('modalShown');
          document.dispatchEvent(event);
        }, 50);

        console.log('✅ Modal forzado abierto');
      } else {
        console.error('❌ No se encontró el elemento del modal');
      }
    }, 100);
  }

  cerrarModalBootstrap() {
    const modalElement = document.getElementById('productModal');
    if (modalElement) {
      // @ts-ignore
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        // Si no existe instancia, crear una y cerrar
        // @ts-ignore
        const newModalInstance = new bootstrap.Modal(modalElement);
        newModalInstance.hide();
      }

      // Limpiar manualmente el backdrop después de un pequeño delay
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 300);
    }
  }

  cerrarModalForzado() {
    console.log('🔄 Cerrando modal forzado...');

    const modalElement = document.getElementById('productModal');
    if (modalElement) {
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      modalElement.style.visibility = 'hidden';
      modalElement.style.opacity = '0';

      // Limpiar estilos inline
      modalElement.style.removeProperty('z-index');

      const modalDialog = modalElement.querySelector('.modal-dialog') as HTMLElement;
      if (modalDialog) {
        modalDialog.style.display = '';
        modalDialog.style.visibility = '';
        modalDialog.style.opacity = '';
        modalDialog.style.removeProperty('z-index');
        modalDialog.style.removeProperty('position');
      }
    }

    // Remover backdrop con animación
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 150);
    });

    // Remover clases del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.removeProperty('overflow');

    // Forzar detección de cambios de Angular
    setTimeout(() => {
      const event = new Event('modalHidden');
      document.dispatchEvent(event);
    }, 50);

    console.log('✅ Modal forzado cerrado');
  }

  // ==========================================
  // 🔹 Product Modal Methods
  // ==========================================

  cargarProductosYCategorias() {
    // Cargar productos
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.productos = products;
        this.filteredProducts = products;
      },
      error: (err) => console.error('Error cargando productos:', err)
    });

    // Cargar categorías
    this.categoriaService.obtenerCategorias().subscribe({
      next: (categories) => {
        this.categorias = categories;
      },
      error: (err) => console.error('Error cargando categorías:', err)
    });
  }

  filtrarProductos() {
    this.filteredProducts = this.productos.filter(producto => {
      // Verificar que producto existe
      if (!producto) return false;

      const matchesCategory = !this.selectedCategoryId ||
        (producto.category && producto.category.id === this.selectedCategoryId);

      const matchesSearch = !this.searchTerm ||
        (producto.name && producto.name.toLowerCase().includes(this.searchTerm.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }

  seleccionarCategoria(categoryId: number | null) {
    this.selectedCategoryId = categoryId;
    this.filtrarProductos();
  }

  agregarProductoDesdeModal(producto: ProductDto) {
    if (!producto || !producto.id) {
      console.error('❌ Intento de agregar producto inválido:', producto);
      return;
    }

    // 1. Buscar la orden activa (la más reciente)
    // Como ya filtramos en cargarDetalleMesaConCarrito, carrito[0] es la más reciente
    const ordenActiva = this.carrito.length > 0 ? this.carrito[0] : null;

    if (ordenActiva) {
      // 2. Si existe una orden activa, agregar el producto a esa orden
      const productoExistente = ordenActiva.products.find((p: any) => p.id === producto.id);

      if (productoExistente) {
        // 2a. Si el producto ya existe en la orden, incrementar cantidad
        const nuevaCantidad = productoExistente.cantidad + 1;
        this.actualizarCantidadEnBackend(ordenActiva.orderId, producto.id, nuevaCantidad);
      } else {
        // 2b. Si el producto no existe, agregarlo a la orden
        this.agregarProductoAOrdenExistente(ordenActiva.orderId, producto.id, 1);
      }
    } else {
      // 3. Si no hay orden activa, crear una nueva orden primero
      this.crearOrdenYAgregarProducto(producto);
    }

    console.log('Producto agregado:', producto.name);
  }

  // ==========================================
  // 🍞 Toast Notifications
  // ==========================================
  toastMessage = '';

  showToast(message: string) {
    this.toastMessage = message;
    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
      // @ts-ignore
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }

  /**
   * Agregar un producto a una orden existente en el backend
   */
  private agregarProductoAOrdenExistente(ordenId: number, productId: number, cantidad: number) {
    // Primero actualizar localmente para feedback inmediato
    const order: CarritoItem | undefined = this.carrito.find(o => o.orderId === ordenId);
    if (order) {
      const existingProduct = order.products.find((p: CarritoProduct) => p.id === productId);
      if (existingProduct) {
        existingProduct.cantidad += cantidad;
        existingProduct.subtotal = existingProduct.cantidad * existingProduct.price;
      } else {
        // Si el producto no existe, necesitamos obtener su información
        // Como no tenemos la información completa aquí, recargaremos del backend
      }
      this.cdr.detectChanges();
    }

    this.ordersService.agregarProductosAOrden(this.mesaId, ordenId, [{ productId, cantidad }])
      .subscribe({
        next: (response) => {
          console.log('✅ Producto agregado a la orden:', response);
          this.showToast('Producto agregado correctamente');
          this.cargarDetalleMesaConCarrito(); // Recargar para sincronizar con backend
          this.cerrarModalForzado(); // Cerrar modal usando método manual
        },
        error: (err) => {
          console.error('❌ Error agregando producto:', err);
          this.cargarDetalleMesaConCarrito(); // Recargar para restaurar estado correcto
          alert('Error al agregar el producto. Por favor intenta nuevamente.');
        }
      });
  }

  /**
   * Actualizar cantidad de un producto existente en el backend
   */
  private actualizarCantidadEnBackend(ordenId: number, productId: number, nuevaCantidad: number) {
    // Primero actualizar localmente para feedback inmediato
    const order: CarritoItem | undefined = this.carrito.find(o => o.orderId === ordenId);
    if (order) {
      const product = order.products.find((p: CarritoProduct) => p.id === productId);
      if (product) {
        product.cantidad = nuevaCantidad;
        product.subtotal = product.cantidad * product.price;
        this.cdr.detectChanges();
      }
    }

    // Luego actualizar en el backend
    this.ordersService.agregarProductosAOrden(this.mesaId, ordenId, [{ productId, cantidad: nuevaCantidad }])
      .subscribe({
        next: (response) => {
          console.log('✅ Cantidad actualizada:', response);
          this.showToast('Cantidad actualizada');
          this.cargarDetalleMesaConCarrito(); // Recargar para sincronizar
        },
        error: (err) => {
          console.error('❌ Error actualizando cantidad:', err);
          this.cargarDetalleMesaConCarrito(); // Recargar para restaurar datos correctos
          alert('Error al actualizar la cantidad. Por favor intenta nuevamente.');
        }
      });
  }

  /**
   * Crear una nueva orden y agregar el producto
   */
  private crearOrdenYAgregarProducto(producto: ProductDto) {
    const createOrderDto: CreateOrderDto = {
      mesaId: this.mesaId,
      status: 'pendiente',
      orderType: 'Local',
      paymentMethod: 'Efectivo',
      propina: 0,
      products: [
        {
          id: producto.id,
          cantidad: 1
        }
      ]
    };

    this.ordersService.crearOrdenPorMesa(this.mesaId, createOrderDto).subscribe({
      next: (nuevaOrden) => {
        console.log('✅ Nueva orden creada:', nuevaOrden);
        this.numeroVenta = nuevaOrden.numeroVenta;

        // Actualizar estado de la mesa localmente a 'Ocupada'
        if (this.mesa) {
          this.mesa.status = 'Ocupada';
        }

        this.showToast('Orden creada y producto agregado');
        this.cerrarModalForzado(); // Cerrar modal usando método manual
        // Forzar detección de cambios inmediatamente
        this.cdr.detectChanges();
        // Recargar el carrito después de cerrar el modal
        setTimeout(() => {
          this.cargarDetalleMesaConCarrito();
          this.cdr.detectChanges();
        }, 100);
      },
      error: (err) => {
        console.error('❌ Error creando orden:', err);
        // Si el error es de validación, mostrar detalles
        if (err.error && err.error.message) {
          alert('Error de validación: ' + (Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message));
        } else {
          alert('Error al crear la orden. Por favor intenta nuevamente.');
        }
      }
    });
  }

}
