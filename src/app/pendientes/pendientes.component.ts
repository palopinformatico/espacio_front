import { Component, ElementRef, OnInit, ViewChild, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { MesaService } from '../services/mesa.service';
import { OrdenService } from '../services/orden.service';
import { CommonModule, DatePipe } from '@angular/common';
import { SocketService } from '../services/socket.service';
import { catchError, Observable, of, Subject, takeUntil, tap, firstValueFrom } from 'rxjs';
import { PrintService } from '../services/print.service';
import { ProductService } from '../services/product.service';
import { Modal } from 'bootstrap';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pendientes',
  imports: [CommonModule, FormsModule],
  templateUrl: './pendientes.component.html',
  styleUrl: './pendientes.component.css'
})
export class PendientesComponent implements OnInit, OnDestroy {
  private orderService = inject(OrdenService);
  private mesaService = inject(MesaService);
  private socketService = inject(SocketService);
  private printService = inject(PrintService);
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('detallePedidoModal') detalleModalRef!: ElementRef;
  @ViewChild('modalPropina', { static: false }) modalPropina!: ElementRef;
  detalleModal!: Modal;
  private modalInstance: Modal | null = null;
  isGuardandoPropina = false;
  pedidoSeleccionado: any;
  private destroy$ = new Subject<void>();

  verDetalle(pedido: any) {
    this.pedidoSeleccionado = pedido;
  }

  pendientes: any[] = []; // Array de mesas agrupadas
  pendientesRaw: any[] = []; // Backup de data original del backend
  pedidosLocal: any[] = [];
  pedidosDelivery: any[] = [];
  mesas: any[] = [];
  productosMap = new Map<number, string>(); // Mapa ID -> Nombre
  activeTab = 'local';
  pedidosAceptados: Set<number> = new Set<number>(); // IDs de pedidos aceptados

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }
  ngOnInit() {
    console.log('🚀 PENDIENTES COMPONENT INIT ✅');

    // Cargar productos para mapeo de nombres
    this.productService.getAllProducts().subscribe({
      next: (products: any[]) => {
        products.forEach((p: any) => this.productosMap.set(p.id, p.name));
        console.log('📚 Productos cargados para mapeo:', this.productosMap.size);
      },
      error: (err: any) => console.error('Error cargando productos', err)
    });

    this.loadPendientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ PENDIENTES CARGADOS INICIALMENTE:', this.pendientes.length);

          // 🔔 Suscribirse a WebSocket para nuevos pedidos
          console.log('📡 Suscribiéndose a WebSocket newOrder...');
          this.socketService.onNewOrder()
            .pipe(takeUntil(this.destroy$))
            .subscribe(order => {
              console.log('🆕 WebSocket newOrder recibido en component:', order);
              this.actualizarPendientes(order);
            });

          // 🔔 Suscribirse a WebSocket para pedidos actualizados
          console.log('📡 Suscribiéndose a WebSocket orderUpdated...');
          this.socketService.onOrderUpdated()
            .pipe(takeUntil(this.destroy$))
            .subscribe(order => {
              console.log('🔄 WebSocket orderUpdated recibido en component:', order);
              this.actualizarPendientes(order);
            });

          // 🔔 Suscribirse a WebSocket para mesas actualizadas
          this.socketService.onMesaUpdated()
            .pipe(takeUntil(this.destroy$))
            .subscribe(data => {
              console.log('🏠 WebSocket mesaUpdated recibido:', data);
              this.actualizarMesas(data);
            });
        }
      });

    // 🔔 Suscribirse a cambios de órdenes para sincronización automática
    // ⚠️ DESHABILITADO: WebSocket ya maneja los updates, esto causaba duplicados
    // this.orderService.ordenesActualizadas$
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(() => {
    //     console.log('🔄 Recargando pendientes por cambio en órdenes...');
    //     this.loadPendientes().subscribe();
    //   });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Cargar mesas desde backend */
  loadMesas() {
    this.mesaService.findAll().subscribe({
      next: data => {
        this.mesas = data.map((m: any) => ({ ...m, status: m.status }));
      },
      error: err => console.error('Error cargando mesas', err)
    });
  }

  /** Cargar pedidos pendientes desde backend (agrupados por mesa) */
  loadPendientes(): Observable<any[]> {
    console.log('loadPendientes() llamado ✅');

    return this.orderService.getPendientes().pipe(
      tap(data => {
        console.log('✅ DATA AGRUPADA POR MESA LLEGÓ:', data);

        // El backend ahora devuelve mesas agrupadas:
        // {
        //   mesaId: number,
        //   mesa: Mesa | null,
        //   customer: Customer | null,
        //   orderType: 'local' | 'delivery',
        //   orderIds: number[],
        //   detalle: Array<{ producto, precioUnitario, cantidad, subtotal }>,
        //   totalMesa: number,
        //   propina: number,
        //   totalConPropina: number
        // }

        this.pendientesRaw = data || [];

        console.log('🔍 DATA COMPLETA DEL BACKEND:', data);
        console.log('🔍 paymentMethod en primera entrada:', data[0]?.paymentMethod);
        console.log('🔍 Campos disponibles en primera entrada:', Object.keys(data[0] || {}));

        // Procesar las mesas agrupadas
        // Siempre obtener datos individuales para tener paymentMethod
        const procesarMesas = (data || []).map(async (mesaAgrupada: any) => {
          const orderIds = mesaAgrupada.orderIds || [];

          // Obtener datos completos de cada orden individualmente
          const ordenesIndividuales = await Promise.all(
            orderIds.map((id: number) =>
              firstValueFrom(this.orderService.getById(id))
                .catch(err => {
                  console.error(`❌ Error obteniendo orden ${id}:`, err);
                  return null;
                })
            )
          );

          return ordenesIndividuales
            .filter((orden: any) => orden != null)
            .map((orden: any) => {
              const items = (orden.items || orden.products || [])
                .map((item: any) => ({
                  productId: item.productId || item.id,
                  name: item.name,
                  cantidad: item.cantidad || item.quantity,
                  subtotal: item.subtotal || (item.price * (item.cantidad || item.quantity)),
                  price: item.price
                }));

              const subtotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
              const neto = orden.neto || subtotal;
              const propina = orden.propina ?? orden.propina_sugerida ?? Math.round(subtotal * 0.1 * 100) / 100;
              const costoDelivery = orden.costo_delivery || 0;
              const total = orden.totalMesa || (neto + propina + costoDelivery);

              // Normalizar customer: orden.customer puede tener diferentes estructuras
              let customer = orden.customer;
              if (customer && customer.name && !customer.customerName) {
                // Convertir estructura de orden.customer a la estructura esperada
                customer = {
                  ...customer,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  customerEmail: customer.email,
                  customerAddress: customer.address
                };
              }
              // Fallback a mesaAgrupada.customer si no tiene customer
              if (!customer) {
                customer = mesaAgrupada.customer;
              }

              const mesaProcesada = {
                ...orden,
                items,
                id: orden.id,
                numeroVenta: orden.numeroVenta || orden.id,
                neto: neto,
                subtotal: subtotal,
                propina: propina,
                costo_delivery: costoDelivery,
                total: total,
                totalMesa: total,
                detalle_venta: orden.detalle_venta || null,
                orderType: orden.orderType || mesaAgrupada.orderType,
                customer: customer,
                mesa: orden.mesa || mesaAgrupada.mesa,
                paymentMethod: orden.paymentMethod || mesaAgrupada.paymentMethod,
                isNew: true
              };

              console.log(`✅ Orden individual:`, {
                numeroVenta: orden.numeroVenta,
                customerName: customer?.customerName || 'Sin Nombre',
                paymentMethod: orden.paymentMethod,
                subtotal,
                propina,
                total
              });

              return mesaProcesada;
            });
        });

        // Resolver todas las promesas y actualizar pendientes
        Promise.all(procesarMesas)
          .then((resultados) => {
            this.pendientes = resultados.flat().filter((m: any) => m && m.items && m.items.length > 0);
            console.log('📊 Órdenes procesadas:', this.pendientes.length);
            this.updatePedidosLists();
          })
          .catch((err) => {
            console.error('❌ Error procesando mesas:', err);
            this.pendientes = [];
          });
        this.updatePedidosLists();
      }),

      catchError(err => {
        console.error('❌ Error cargando pendientes', err);
        return of([]);
      })
    );
  }






  /** Recarga pendientes cuando hay cambios por WebSocket */
  actualizarPendientes(order: any) {
    console.log('📥 actualizarPendientes llamado con orden:', order?.id);

    if (!order?.id) {
      console.warn('⚠️ Pedido sin ID, ignorando:', order);
      return;
    }

    // 🔄 Con la nueva estructura agrupada por mesa, es más simple recargar todo
    // para mantener la agrupación correcta, en lugar de intentar actualizar individualmente
    console.log('🔄 Recargando pendientes para mantener agrupación correcta...');

    this.loadPendientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Pendientes recargados después de WebSocket update');

          // 🔔 Si es una orden nueva, reproducir sonido
          const estado = (order.estado || order.status || '').toLowerCase();
          if (estado === 'pendiente') {
            this.playSound();
          }
        },
        error: err => console.error('❌ Error recargando pendientes:', err)
      });
  }

  // Separar mesas agrupadas por Local / Delivery
  updatePedidosLists() {
    this.pedidosLocal = this.pendientes.filter(m => m.orderType === 'local');
    this.pedidosDelivery = this.pendientes.filter(m => m.orderType === 'delivery');
    console.log('🔄 updatePedidosLists ejecutado - Local:', this.pedidosLocal.length, 'Delivery:', this.pedidosDelivery.length);

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }









  /** Actualiza las mesas y refleja cambios en mesas agrupadas */
  actualizarMesas(data: any) {
    const mesa = this.mesas.find(m => m.id === data.mesaId);
    if (!mesa) return;

    mesa.status = data.status;

    // Reflejar cambio de estado en mesas agrupadas asociadas
    this.pendientes.forEach(mesaAgrupada => {
      if (mesaAgrupada.mesaId === mesa.id) {
        if (!mesaAgrupada.mesa) {
          mesaAgrupada.mesa = { id: mesa.id, numero_mesa: mesa.numero_mesa, status: mesa.status };
        } else {
          mesaAgrupada.mesa.status = mesa.status;
        }
      }
    });

    this.updatePedidosLists();
  }

  /** Aceptar todos los pedidos de una mesa agrupada */
  aceptar(mesaAgrupadaId: number) {
    // Buscar la mesa agrupada para obtener los orderIds
    const mesaAgrupada = this.pendientes.find(p => p.id === mesaAgrupadaId);
    if (!mesaAgrupada) {
      console.error('❌ Mesa agrupada no encontrada:', mesaAgrupadaId);
      return;
    }

    // Mostrar modal de confirmación
    Swal.fire({
      icon: 'question',
      title: '¿Confirmar pago?',
      text: 'El pedido será marcado como pagado y la mesa será liberada.',
      confirmButtonText: 'Confirmar pago',
      cancelButtonText: 'Atrás',
      showCancelButton: true,
      confirmButtonColor: '#28a745'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const orderIds = mesaAgrupada.orderIds || [mesaAgrupadaId];
      const mesaId = mesaAgrupada.mesaId;

      console.log('💰 Pagando todos los pedidos de la mesa:', orderIds);

      // Actualizar el estado de todas las órdenes en el backend a "Pagado"
      const actualizarOrdenesPromises = orderIds.map((orderId: number) => {
        const orden = this.pendientes.find(p => p.id === orderId || p.orderIds?.includes(orderId));
        const total = orden?.totalMesa || orden?.total || 0;
        return firstValueFrom(this.orderService.actualizarDetalleVenta(orderId, { status: 'Pagado', total }));
      });

      Promise.all(actualizarOrdenesPromises)
        .then(() => {
          console.log('✅ Todos los pedidos actualizados en el backend');

          // Eliminar la mesa agrupada de pendientes
          this.pendientes = this.pendientes.filter(p => p.id !== mesaAgrupadaId);
          this.updatePedidosLists();
          this.playAudio('/aceptar.mp3');
          console.log('✅ Todos los pedidos de la mesa aceptados:', orderIds);

          Swal.fire({
            icon: 'success',
            title: '¡Pago confirmado!',
            timer: 1500,
            showConfirmButton: false
          });

          // 🔹 Si la mesa tenía ID, liberarla
          if (mesaId && mesaId !== 0) {
            console.log('🔓 Liberando mesa ID:', mesaId);
            this.mesaService.marcarPedidoPagado(mesaId).subscribe({
              next: () => {
                console.log('✅ Mesa liberada correctamente');
                const mesa = this.mesas.find(m => m.id === mesaId);
                if (mesa) {
                  mesa.status = 'Libre';
                }
                this.orderService.notificarCambioOrdenes();
              },
              error: err => console.error('❌ Error al liberar mesa:', err)
            });
          }
        })
        .catch((err) => {
          console.error('❌ Error al actualizar pedidos en el backend:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error al procesar pago',
            text: 'Hubo un error al actualizar el estado de las órdenes'
          });
        });
    });
  }

  pendiente(mesaAgrupadaId: number) {
    // Buscar la mesa agrupada para obtener los orderIds
    const mesaAgrupada = this.pendientes.find(p => p.id === mesaAgrupadaId);
    if (!mesaAgrupada) {
      console.error('❌ Mesa agrupada no encontrada:', mesaAgrupadaId);
      return;
    }

    // Mostrar modal de confirmación
    Swal.fire({
      icon: 'question',
      title: '¿Aceptar pedido?',
      text: 'El pedido será aceptado y se actualizará el estado.',
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true
    }).then((result) => {
      if (!result.isConfirmed) return;

      const orderIds = mesaAgrupada.orderIds || [mesaAgrupadaId];

      console.log('✅ Aceptando pedido (estado pendiente) para todas las órdenes:', orderIds);

      // Actualizar estado de todas las órdenes a "aceptado" o similar
      const updatePromises = orderIds.map((orderId: number) => {
        console.log('📤 Llamando pendienteVenta para orderId:', orderId);
        return firstValueFrom(this.orderService.pendienteVenta(orderId)).catch(err => {
          console.error(`❌ Error en pendienteVenta(${orderId}):`, err);
          throw err; // Re-lanzar error
        });
      });

      Promise.all(updatePromises)
        .then((responses) => {
          console.log('✅ Todas las órdenes actualizadas en BD:', responses);

          // Marcar pedidos como aceptados
          orderIds.forEach((orderId: number) => {
            this.pedidosAceptados.add(orderId);
          });

          this.playAudio('/aceptar.mp3');

          Swal.fire({
            icon: 'success',
            title: '¡Pedido aceptado!',
            timer: 1500,
            showConfirmButton: false
          });

          // Recargar pendientes desde el backend para sincronizar
          console.log('🔄 Recargando pendientes desde BD...');
          this.loadPendientes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                console.log('✅ Pendientes recargados después de aceptar');
                this.orderService.notificarCambioOrdenes();
              },
              error: err => console.error('❌ Error recargando pendientes:', err)
            });
        })
        .catch(err => {
          console.error('❌ Error al aceptar pedidos:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error al aceptar',
            text: 'No se pudo aceptar el pedido. Verifica tu conexión o contacta con soporte.'
          });
        });
    });
  }








  /** Cancelar todos los pedidos de una mesa agrupada */
  cancelar(mesaAgrupadaId: number) {
    // Buscar la mesa agrupada para obtener los orderIds
    const mesaAgrupada = this.pendientes.find(p => p.id === mesaAgrupadaId);
    if (!mesaAgrupada) {
      console.error('❌ Mesa agrupada no encontrada:', mesaAgrupadaId);
      return;
    }

    // Mostrar modal de confirmación
    Swal.fire({
      icon: 'warning',
      title: '¿Cancelar pedido?',
      text: 'El pedido será cancelado y no se podrá recuperar.',
      confirmButtonText: 'Cancelar pedido',
      cancelButtonText: 'Atrás',
      showCancelButton: true,
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const orderIds = mesaAgrupada.orderIds || [mesaAgrupadaId];
      const mesaId = mesaAgrupada.mesaId;

      console.log('🗑️ Cancelando todos los pedidos de la mesa:', orderIds);

      // Cancelar todas las órdenes de la mesa
      const cancelPromises = orderIds.map((orderId: number) =>
        firstValueFrom(this.orderService.cancelarVenta(orderId))
      );

      Promise.all(cancelPromises).then(() => {
        // Eliminar la mesa agrupada de pendientes
        this.pendientes = this.pendientes.filter(p => p.id !== mesaAgrupadaId);
        this.updatePedidosLists();
        this.playAudio('/cancel.mp3');
        console.log('✅ Todos los pedidos de la mesa cancelados:', orderIds);

        Swal.fire({
          icon: 'success',
          title: '¡Pedido cancelado!',
          timer: 1500,
          showConfirmButton: false
        });

        // 🔹 Si la mesa tenía ID, liberarla
        if (mesaId && mesaId !== 0) {
          console.log('🔓 Liberando mesa ID:', mesaId);
          this.mesaService.actualizarEstadoMesa(mesaId, 'Libre').subscribe({
            next: () => {
              console.log('✅ Mesa liberada correctamente');
              const mesa = this.mesas.find(m => m.id === mesaId);
              if (mesa) {
                mesa.status = 'Libre';
              }
              this.orderService.notificarCambioOrdenes();
            },
            error: err => console.error('❌ Error al liberar mesa:', err)
          });
        } else {
          this.orderService.notificarCambioOrdenes();
        }
      }).catch(err => {
        console.error('❌ Error al cancelar pedidos:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cancelar el pedido'
        });
      });
    });
  }

  /** Actualiza un pedido en la lista local */
  private updatePedidoLocal(updatedOrder: any) {
    // Actualizar pedido en la lista local
    const index = this.pendientes.findIndex(p => p.id === updatedOrder.id);
    if (index !== -1) {
      this.pendientes[index] = updatedOrder;
    }

    // Actualizar estado de la mesa asociada
    if (updatedOrder.mesaId) {
      const mesa = this.mesas.find(m => m.id === updatedOrder.mesaId);

      if (mesa) {
        // Estados que liberan mesa (cuando cobras o cancelas)
        const liberadores = ['pagado', 'cancelado'];

        mesa.status = liberadores.includes(updatedOrder.status.toLowerCase())
          ? 'Libre'
          : 'Ocupada';
      }
    }

    this.updatePedidosLists();
  }


  /** Sonido general */
  private playSound() {
    this.playAudio('/sonido.mp3');
  }

  private playAudio(url: string) {
    try { new Audio(url).play(); } catch (e) { console.warn(e); }
  }

  /** Tab activo */
  setActiveTab(tab: string) { this.activeTab = tab; }

  /** Track by para ngFor */
  trackById(index: number, item: any) { return item.id; }

  /** Formatea precio */
  formatPrice(value: number): string {
    if (value == null) return '';
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  async imprimirTickets(mesaAgrupada: any) {
    if (!mesaAgrupada) return;

    try {
      // Mostrar loading
      console.log('🖨️ Imprimiendo tickets para mesa agrupada:', mesaAgrupada.mesaId);

      // Primero imprimir ticket de caja (boleta completa)
      console.log('📄 Imprimiendo ticket de caja...');
      await this.printService.generarTicketCaja(mesaAgrupada);

      // Esperar un momento antes de imprimir el siguiente
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Luego imprimir ticket de cocina (solo productos)
      console.log('👨‍🍳 Imprimiendo ticket de cocina...');
      await this.printService.generarTicketCocina(mesaAgrupada);

      console.log('✅ Tickets impresos correctamente');
    } catch (error) {
      console.error('❌ Error al imprimir tickets:', error);
    }
  }

  /** Imprimir solo ticket de caja para mesa agrupada */
  async imprimirTicketCaja(mesaAgrupada: any) {
    if (!mesaAgrupada) return;

    try {
      console.log('🖨️ Imprimiendo ticket de CAJA para mesa agrupada:', mesaAgrupada.mesaId);
      await this.printService.generarTicketCaja(mesaAgrupada);

      Swal.fire({
        icon: 'success',
        title: '✅ Ticket de Caja Impreso',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });

      console.log('✅ Ticket de caja impreso correctamente');
    } catch (error) {
      console.error('❌ Error al imprimir ticket de caja:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al imprimir',
        text: 'No se pudo imprimir el ticket de caja',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  /** Imprimir solo ticket de cocina para mesa agrupada */
  async imprimirTicketCocina(mesaAgrupada: any) {
    if (!mesaAgrupada) return;

    try {
      console.log('🖨️ Imprimiendo ticket de COCINA para mesa agrupada:', mesaAgrupada.mesaId);
      await this.printService.generarTicketCocina(mesaAgrupada);

      Swal.fire({
        icon: 'success',
        title: '✅ Ticket de Cocina Impreso',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });

      console.log('✅ Ticket de cocina impreso correctamente');
    } catch (error) {
      console.error('❌ Error al imprimir ticket de cocina:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al imprimir',
        text: 'No se pudo imprimir el ticket de cocina',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  pedidoActual: any = {
    subtotal: 0,
    propinaSeleccionada: 0.10,
    propinaPersonalizada: 0,
    propina: 0,
    total: 0
  };



  abrirModal(mesaAgrupada: any) {
    // Para mesa agrupada, el subtotal es totalMesa sin la propina
    const subtotal = (mesaAgrupada.totalMesa || mesaAgrupada.total || 0) - (mesaAgrupada.propina || 0);
    const propinaActual = mesaAgrupada.propina ?? 0;

    // ✅ Detectar automáticamente qué botón debe activarse
    let seleccion = 0.10;
    let personalizada = 0;

    if (propinaActual === 0) {
      seleccion = 0;
    }
    else if (propinaActual === Math.round(subtotal * 0.05)) {
      seleccion = 0.05;
    }
    else if (propinaActual === Math.round(subtotal * 0.10)) {
      seleccion = 0.10;
    }
    else if (propinaActual === Math.round(subtotal * 0.12)) {
      seleccion = 0.12;
    }
    else {
      // ✅ Si no coincide → personalizada
      seleccion = -1;
      personalizada = propinaActual;
    }

    this.pedidoActual = {
      ...mesaAgrupada,
      subtotal,
      propinaSeleccionada: seleccion,
      propinaPersonalizada: personalizada,
      propina: propinaActual,
      total: subtotal + propinaActual
    };

    this.recalcularPropina();

    // ✅ abrir modal Bootstrap
    if (this.modalPropina) {
      this.modalInstance = new Modal(this.modalPropina.nativeElement);
      this.modalInstance.show();
    }
  }


  seleccionarPropina(valor: number) {
    this.pedidoActual.propinaSeleccionada = valor;
    if (valor !== -1) {
      this.pedidoActual.propinaPersonalizada = 0;
    }
    this.recalcularPropina();
  }

  recalcularPropina() {
    if (!this.pedidoActual) return;

    const subtotal = this.pedidoActual.subtotal ?? 0;

    let propina = 0;

    if (this.pedidoActual.propinaSeleccionada === -1) {
      // personalizada
      propina = Number(this.pedidoActual.propinaPersonalizada) || 0;
    } else {
      // porcentaje
      propina = Math.round(subtotal * this.pedidoActual.propinaSeleccionada);
    }

    this.pedidoActual.propina = propina;
    this.pedidoActual.total = subtotal + propina;
  }



  guardarPropina() {
    if (!this.pedidoActual) return;

    // ✅ Validación para custom: solo bloquear valores negativos (0 es válido)
    if (this.pedidoActual.propinaSeleccionada === -1 &&
      (this.pedidoActual.propinaPersonalizada == null || this.pedidoActual.propinaPersonalizada < 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'Propina inválida',
        text: 'Ingresa un valor válido de propina (0 o mayor)',
      });
      return;
    }

    this.isGuardandoPropina = true;

    // Determinar tipo y valor
    let propinaTipo: '0' | '5' | '10' | '12' | 'custom' = '10';
    let propinaValor: number | undefined;

    switch (this.pedidoActual.propinaSeleccionada) {
      case 0: propinaTipo = '0'; break;
      case 0.05: propinaTipo = '5'; break;
      case 0.10: propinaTipo = '10'; break;
      case 0.12: propinaTipo = '12'; break;
      case -1:
        propinaTipo = 'custom';
        propinaValor = this.pedidoActual.propinaPersonalizada || 0;
        break;
    }

    // Solo actualizar el orderId específico que estamos editando
    const orderId = this.pedidoActual.id || this.pedidoActual.numeroVenta;
    const nuevaPropina = this.pedidoActual.propina;

    console.log('💰 Guardar Propina - orderId:', orderId, { propinaTipo, propinaValor, nuevaPropina });

    // Actualizar propina SOLO para esta orden específica
    firstValueFrom(this.orderService.updateOrder(orderId, {
      propinaTipo,
      propinaValor
    }))
      .then((respuesta) => {
        console.log('✅ Respuesta del backend recibida:', respuesta);
        
        // Buscar el pedido en ambas listas (local y delivery)
        let pedidoEnUI = this.pedidosLocal.find(p => p.id === orderId || p.numeroVenta === orderId) ||
                         this.pedidosDelivery.find(p => p.id === orderId || p.numeroVenta === orderId);
        
        if (pedidoEnUI) {
          console.log('✅ Pedido encontrado en UI');
          console.log('📊 Datos antes de actualizar:', { 
            propina: pedidoEnUI.propina, 
            total: pedidoEnUI.total,
            totalMesa: pedidoEnUI.totalMesa
          });
          
          // Actualizar la propina sugerida
          pedidoEnUI.propina = nuevaPropina;
          
          // Recalcular el total: neto + costo_delivery (si existe) + propina
          const neto = pedidoEnUI.neto || 0;
          const costoDelivery = pedidoEnUI.costo_delivery || 0;
          const nuevoTotal = neto + costoDelivery + nuevaPropina;
          
          pedidoEnUI.total = nuevoTotal;
          pedidoEnUI.totalMesa = nuevoTotal;
          
          console.log('📊 Datos después de actualizar:', { 
            propina: pedidoEnUI.propina, 
            total: pedidoEnUI.total,
            totalMesa: pedidoEnUI.totalMesa,
            neto,
            costoDelivery,
            nuevaPropina
          });
        } else {
          console.warn('⚠️ Pedido no encontrado en UI. ID buscado:', orderId);
          console.log('📋 Pedidos locales:', this.pedidosLocal.map(p => ({ id: p.id, numeroVenta: p.numeroVenta })));
          console.log('📋 Pedidos delivery:', this.pedidosDelivery.map(p => ({ id: p.id, numeroVenta: p.numeroVenta })));
        }

        // Cerrar modal
        if (this.modalInstance) this.modalInstance.hide();

        Swal.fire({
          icon: 'success',
          title: '¡Propina actualizada!',
          text: `Propina: ${this.formatPrice(nuevaPropina)}`,
          timer: 2000,
          showConfirmButton: false
        });

        this.isGuardandoPropina = false;
        // Forzar actualización de UI
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('❌ Error al actualizar propina:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar la propina. Verifica tu conexión.',
        });
        this.isGuardandoPropina = false;
      });
  }


  abrirModalPropina(mesaAgrupada: any) {
    // Usar el subtotal directo si está disponible, sino calcularlo
    const subtotalReal = mesaAgrupada.subtotal || mesaAgrupada.neto || ((mesaAgrupada.totalMesa || mesaAgrupada.total || 0) - (mesaAgrupada.propina || 0));
    const propinaActual = mesaAgrupada.propina ?? 0;

    // Detectar automáticamente qué botón debe activarse
    let seleccion = 0.10;
    let personalizada = 0;

    if (propinaActual === 0) {
      seleccion = 0;
    }
    else if (propinaActual === Math.round(subtotalReal * 0.05)) {
      seleccion = 0.05;
    }
    else if (propinaActual === Math.round(subtotalReal * 0.10)) {
      seleccion = 0.10;
    }
    else if (propinaActual === Math.round(subtotalReal * 0.12)) {
      seleccion = 0.12;
    }
    else {
      // Si no coincide → personalizada
      seleccion = -1;
      personalizada = propinaActual;
    }

    this.pedidoActual = {
      ...mesaAgrupada,
      propinaSeleccionada: seleccion,
      propinaPersonalizada: personalizada,
      subtotal: subtotalReal,
      propina: propinaActual,
      total: subtotalReal + propinaActual
    };

    this.recalcularPropina();

    if (this.modalPropina) {
      this.modalInstance = new Modal(this.modalPropina.nativeElement);
      this.modalInstance.show();
    }
  }


  // Cerrar modal
  cerrarModal() {
    if (this.modalInstance) this.modalInstance.hide();
  }

  abrirModalPropinaDelivery(pedido: any) {
    // Reutilizar la misma lógica que para local, ya que ahora es robusta
    this.abrirModalPropina(pedido);
  }

  guardarDetalle(mesaAgrupada: any) {
    if (!mesaAgrupada) return;

    // Actualizar el detalle_venta para todas las órdenes de la mesa
    const orderIds = mesaAgrupada.orderIds || [mesaAgrupada.id];

    console.log('📝 Actualizando detalle_venta para todas las órdenes:', orderIds);

    // Actualizar todas las órdenes con el mismo detalle_venta
    const updatePromises = orderIds.map((orderId: number) =>
      firstValueFrom(this.orderService.updateOrder(orderId, {
        detalle_venta: mesaAgrupada.detalle_venta
      }))
    );

    Promise.all(updatePromises)
      .then(() => {
        console.log('✅ Detalle actualizado para todas las órdenes de la mesa');
      })
      .catch((err) => console.error('❌ Error al guardar detalle:', err));
  }







}