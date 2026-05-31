import { CommonModule, DecimalPipe, NgIfContext } from '@angular/common';
import { Component, ElementRef, Input, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriaService } from '../services/categoria.service';
import { UsuarioService } from '../services/usuario.service';
import { HeaderComponent } from '../header/header.component';

import { OrdenService } from '../services/orden.service';
import { ProductService } from '../services/product.service';
import jsPDF from 'jspdf';
import { CreateMesaDto, Mesa, MesaService, UpdateMesaDto } from '../services/mesa.service';
import { MesasComponent } from "../pages/mesas/mesas.component";

import { Store } from '@ngrx/store';
import * as MesasActions from '../../store/mesas.actions';
import { GastoComponent } from '../gastos/gastos.component';
import { PendientesComponent } from '../pendientes/pendientes.component';
import Swal from 'sweetalert2';
import { SocketService } from '../services/socket.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TicketBarService, CreateTicketBarDto } from '../services/ticket-bar.service';
import { PrintService } from '../services/print.service'; // Added import
import { DisponibilidadService } from '../services/disponibilidad.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { IngresosComponent } from "../admin/ingresos/ingresos.component";

declare let bootstrap: any;

export interface CreateOrderDto {
  orderType: string;
  status: string;
  total: number;
  createdAt?: Date;
  paymentMethod: string;
  userId?: number;
  customerId?: number;
  productId?: number;
  propinaId?: number;
  mesaId?: number;
}

interface Producto {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: number;
}

interface ProductoCarrito extends Producto {
  cantidad: number;
}

@Component({
  selector: 'app-garzon',
  standalone: true,
  providers: [DecimalPipe,provideNgxMask(),],
  imports: [NgxMaskDirective, CommonModule, FormsModule, MesasComponent, GastoComponent, PendientesComponent, HeaderComponent, IngresosComponent],
  templateUrl: './garzon.component.html',
  styleUrl: './garzon.component.css'
})
export class GarzonComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pendientesComponent') pendientesComponent!: PendientesComponent;

  @Input() showHeaderAndMenu = true; // Control whether to show header and menu

  constructor(
    private categoriaService: CategoriaService,
    private usuarioService: UsuarioService,
    private ordenService: OrdenService,
    private productService: ProductService,
    private mesaService: MesaService,
    private socketService: SocketService,
    private store: Store<{ mesas: any }>,
    private authService: AuthService,
    private ticketBarService: TicketBarService,
    private printService: PrintService, // Added injection
    private disponibilidadService: DisponibilidadService,
    private router: Router
  ) { }
  private subs: Subscription[] = [];
  private destroy$ = new Subject<void>();
  @ViewChild('carousel', { static: false }) carousel!: ElementRef;
  mesas: Mesa[] = [];
  isGarzon = false;
  localDisponible = false;
  mesaSeleccionada!: number;
  detalle!: string;
  mesaSeleccionadas!: number;
  vacio!: TemplateRef<NgIfContext<boolean>> | null;
  orderType = 'local';
  orders!: CreateOrderDto;
  enviandoPedido = false; // Para prevenir doble clic y mostrar estado de carga
  idOrdenCreada: number | null = null;
  mostrarBotonCancelar = false;
  historialPedidos: any[] = [];
  categorias: any[] = [];

  // Legacy/General Product Search Props
  productos: any[] = [];
  productosFiltrados: any[] = [];
  allProducts: any[] = [];
  filtro: string = '';
  ordenActual: 'asc' | 'desc' | null = null;

  // 🛒 GENERAL CART
  carrito: ProductoCarrito[] = [];
  activeTab: string = 'pedido';

  // 🍺 BAR MODULE - Propiedades
  carritoBar: ProductoCarrito[] = [];
  tipoTicketSeleccionado: 'normal' | 'rapido' = 'normal';
  enviandoTicketBar = false;
  categoriaBarSeleccionada: number | null = null;
  ticketsBar: any[] = []; // Historial de tickets
  ticketsBarAgrupados: any[] = []; // Tickets agrupados por sesión para mostrar
  cargandoTickets = false;

  // Header Logic
  currentUser: any = null;
  userImage = '/logo.png';
  userName = 'Usuario';

  // 🍺 BAR MODULE - Sesión de ticket activo (acumulación de productos)
  ticketNormalActivo: boolean = false;           // Si hay una sesión de ticket normal en curso
  productosEnSesion: ProductoCarrito[] = [];     // Productos agregados en la sesión actual
  sesionTicketIds: number[] = [];                // IDs de tickets creados en esta sesión
  tipoTicketSesion: 'normal' | 'rapido' = 'normal'; // Tipo del ticket de la sesión activa
  barSessionId: number = 0;                      // ID único de la sesión (timestamp) para agrupar tickets
  propinaSesionActual: number = 0;               // 💰 Propina acumulada de la sesión actual

  // 🍺 BAR SUB-TABS
  activeBarTab: 'consumo' | 'abiertos' | 'cerrados' = 'consumo';

  setActiveBarTab(tab: 'consumo' | 'abiertos' | 'cerrados') {
    this.activeBarTab = tab;
  }

  onTabChange(tab: string) {
    if (tab === 'mesas') {
      this.store.dispatch(MesasActions.cargarMesas());
    }
  }

  showScrollButton = false; // Para botón scroll to top

  // State for PEDIDO Tab
  productosPedido: any[] = [];
  allProductsPedido: any[] = [];
  sidPedido: number | null = null;
  filtroPedido = '';
  ordenPedido: 'asc' | 'desc' | null = null;

  // State for BAR Tab
  productosBar: any[] = [];
  allProductsBar: any[] = [];
  sidBar: number | null = null;
  filtroBar = '';



  // Clean up old state variables if no longer used, or keep 'productos' if used elsewhere (but plan is replacing usage)
  // productos: any[] = []; // Removed to force compilation error if I missed something
  // allProducts: any[] = [];
  // sid: number | null = null;
  // filtro: string = '';
  // ordenActual: 'asc' | 'desc' | null = null;

  // Re-declared for compatibility during refactor if needed, but better to use new ones.
  // Converting old property usages to getters/setters or just finding usages is safer.

  ngOnInit(): void {
    // Verificar disponibilidad del servicio local
    this.disponibilidadService.verificarDisponibilidadLocal().subscribe(
      disponible => {
        this.localDisponible = disponible;
      },
      error => {
        console.error('Error al verificar disponibilidad:', error);
        // En caso de error, habilitar por defecto
        this.localDisponible = true;
      }
    );

    this.subs.push(
      this.socketService.onMesaUpdated().subscribe((data: any) => {
        // data: { mesaId, status }
        const m = this.mesas.find(x => x.id === data.mesaId);
        if (m) {
          m.status = data.status;
        } else {
          // opcional: recargar lista si no existe
          this.cargarMesas();
        }
      })
    );

    // Listener para botón scroll to top
    window.addEventListener('scroll', () => {
      this.showScrollButton = window.scrollY > 300;
    });

    this.isGarzon = this.authService.getUserRole() === 'garzon' || this.authService.getUserRole() === 'admin';

    // Load Initial Data
    this.categoria();
    this.cargarProductosPedido(); // Load for Pedido tab
    this.cargarProductosBar();    // Load for Bar tab (initially all, or wait for category)

    this.mesaService.mesas$.subscribe(data => {
      this.mesas = data;
    });
    this.cargarMesas();
    // this.all(); // Replaced by independent loads

    // 🔔 Suscribirse a cambios de órdenes para sincronización automática (RxJS)
    this.ordenService.ordenesActualizadas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 GarzonComponent: Recargando mesas por cambio en órdenes (RxJS)...');
        this.cargarMesas();
      });

    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCurrentUser() {
    this.currentUser = this.authService.getUser();
    if (this.currentUser) {
      this.userName = this.currentUser.username || 'Usuario';
    }
  }

  cargarMesas(): void {
    this.mesaService.findAll();
  }

  // --- PEDIDO TAB LOGIC ---

  buscarCategoriaPedido(id: number): void {
    this.sidPedido = id === 0 ? null : id;
    this.cargarProductosPedido();
  }

  cargarProductosPedido(): void {
    this.productService
      .buscarProductos({
        nombre: '',
        categoryIds: this.sidPedido ? [Number(this.sidPedido)] : undefined,
        limit: 1000
      })
      .subscribe((resp: any) => {
        this.allProductsPedido = resp.data || [];
        this.aplicarFiltrosPedido();
      });
  }

  aplicarFiltrosPedido(): void {
    let resultado = [...this.allProductsPedido];

    if (this.filtroPedido) {
      const filtroLower = this.filtroPedido.toLowerCase();
      resultado = resultado.filter(p =>
        p.name?.toLowerCase().includes(filtroLower) ||
        p.description?.toLowerCase().includes(filtroLower)
      );
    }

    if (this.ordenPedido === 'asc') {
      resultado.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.ordenPedido === 'desc') {
      resultado.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    this.productosPedido = resultado;
  }

  filtrarProductosPedido(): void {
    this.aplicarFiltrosPedido();
  }

  ordenarPorPrecioPedido(orden: 'asc' | 'desc'): void {
    this.ordenPedido = this.ordenPedido === orden ? null : orden;
    this.aplicarFiltrosPedido();
  }

  limpiarFiltroPedido(): void {
    this.filtroPedido = '';
    this.ordenPedido = null;
    this.aplicarFiltrosPedido();
  }

  resetearFiltrosPedido(): void {
    this.filtroPedido = '';
    this.ordenPedido = null;
    this.aplicarFiltrosPedido();
  }


  // --- BAR TAB LOGIC ---

  buscarCategoriaBar(id: number): void {
    this.sidBar = id === 0 ? null : id;
    this.cargarProductosBar();
  }

  cargarProductosBar(): void {
    this.productService
      .buscarProductos({
        nombre: '',
        categoryIds: this.sidBar ? [Number(this.sidBar)] : undefined,
        limit: 1000
      })
      .subscribe((resp: any) => {
        this.allProductsBar = resp.data || [];
        this.productosBar = [...this.allProductsBar]; // No filtering needed yet for Bar
      });
  }

  categoria(): void {
    this.categoriaService.obtenerCategorias().subscribe({
      next: data => {
        this.categorias = data;

        // Initialize Bar default category independently
        const barCategory = this.categorias.find(c => c.nombre && c.nombre.toLowerCase() === 'bar');
        if (barCategory) {
          this.buscarCategoriaBar(barCategory.id);
        } else {
          this.cargarProductosBar(); // Load all if no 'Bar' category found
        }
      },
      error: err => console.error('Error al buscar productos:', err)
    });
  }



  agregarAlCarrito(producto: Producto) {
    const item = this.carrito.find(p => p.id === producto.id);
    if (item) {
      item.cantidad++;
    } else {
      this.carrito.push({ ...producto, cantidad: 1 });
    }
  }

  agregarAlCarritos(producto: Producto) {
    const item = this.carrito.find(p => p.id === producto.id);
    if (item) {
      item.cantidad++;
    } else {
      this.carrito.push({ ...producto, cantidad: 1 });
    }
  }



  eliminarDelCarrito(id: number) {
    this.carrito = this.carrito.filter(p => p.id !== id);
  }

  getTotal(): number {
    return this.carrito.reduce((total, item) => total + item.price * item.cantidad, 0);
  }

  getCantidadTotal(): number {
    return this.carrito.reduce((total, item) => total + item.cantidad, 0);
  }
  aceptarPedido() {
    // Prevenir doble clic
    if (this.enviandoPedido) {
      Swal.fire({
        icon: 'info',
        title: 'Procesando...',
        text: 'Ya se está enviando un pedido, por favor espera.',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-premium',
          title: 'swal-title-premium',
          htmlContainer: 'swal-html-container-premium',
          confirmButton: 'swal-confirm-button-premium'
        },
        buttonsStyling: false
      });
      return;
    }

    if (this.carrito.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'El carrito está vacío',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-premium',
          title: 'swal-title-premium',
          htmlContainer: 'swal-html-container-premium',
          confirmButton: 'swal-confirm-button-premium'
        },
        buttonsStyling: false
      });
      return;
    }

    // ✅ Validar que haya una mesa seleccionada
    if (!this.mesaSeleccionada || this.mesaSeleccionada === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Mesa no seleccionada',
        text: '⚠️ Por favor selecciona una mesa antes de crear el pedido',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-premium',
          title: 'swal-title-premium',
          htmlContainer: 'swal-html-container-premium',
          confirmButton: 'swal-confirm-button-premium'
        },
        buttonsStyling: false
      });
      return;
    }

    const mesa = this.mesas.find(m => m.id === Number(this.mesaSeleccionada));
    if (mesa && mesa.status.toLowerCase() === 'ocupada') {
      Swal.fire({
        icon: 'warning',
        title: 'Mesa ocupada',
        text: 'No puedes agregar más productos a esta mesa',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-premium',
          title: 'swal-title-premium',
          htmlContainer: 'swal-html-container-premium',
          confirmButton: 'swal-confirm-button-premium'
        },
        buttonsStyling: false
      });
      return;
    }


    const pedido = {
      tableNumber: Number(this.mesaSeleccionada),
      orderType: this.orderType,
      detalle_venta: this.detalle?.trim() || null,
      propina: this.getPropina(),
      status: 'pendiente',
      paymentMethod: '',
      mesaId: Number(this.mesaSeleccionada),
      products: this.carrito.map(p => ({
        id: p.id,
        cantidad: p.cantidad
      }))
    };

    console.log('📤 Enviando pedido:', pedido); // Debug

    // Activar estado de carga
    this.enviandoPedido = true;

    // Mostrar indicador de carga
    Swal.fire({
      title: 'Enviando pedido...',
      text: 'Por favor espera mientras procesamos tu orden.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: '#ffffff',
      color: '#000000',
      customClass: {
        popup: 'swal-popup-premium',
        title: 'swal-title-premium',
        htmlContainer: 'swal-html-container-premium'
      },
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ordenService.createOrder(pedido).subscribe({
      next: (res) => {
        this.enviandoPedido = false; // Desactivar estado de carga

        // Habilitar botón de cancelar pedido temporalmente
        if (res && res.id) {
          this.idOrdenCreada = res.id;
          this.mostrarBotonCancelar = true;
        }

        Swal.fire({
          icon: 'success',
          title: 'Orden Registrada ✅',
          text: 'Orden registrada correctamente',
          timer: 1500,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-premium',
            title: 'swal-title-premium',
            htmlContainer: 'swal-html-container-premium',
            confirmButton: 'swal-confirm-button-premium'
          },
          buttonsStyling: false
        });
        console.log('Orden creada:', res);
        this.carrito = [];
        this.detalle = '';
      },
      error: (err) => {
        this.enviandoPedido = false; // Desactivar estado de carga
        console.error('❌ Error al crear orden:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al crear la orden: ' + (err.error?.message || err.message),
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-premium',
            title: 'swal-title-premium',
            htmlContainer: 'swal-html-container-premium',
            confirmButton: 'swal-confirm-button-premium'
          },
          buttonsStyling: false
        });
      }
    });
  }



  // Funciones de totales
  getSubtotal(): number {
    return this.carrito.reduce((acc, item) => acc + item.price * item.cantidad, 0);
  }

  getPropina(): number {
    return Math.round(this.getSubtotal() * 0.1); // 10% propina
  }



  onMesaChange() {
    this.cargarHistorial();
  }

  cargarHistorial() {
    if (!this.mesaSeleccionada) {
      this.historialPedidos = [];
      return;
    }
    const clave = `${this.mesaSeleccionada}`;
    const data = localStorage.getItem(clave);
    this.historialPedidos = data ? JSON.parse(data) : [];
  }

  cancelarPedido() {
    if (!this.idOrdenCreada) return;

    // Primero obtener la orden para saber si tiene mesaId
    this.ordenService.getById(this.idOrdenCreada).subscribe({
      next: (orden) => {
        const mesaId = orden?.mesaId;

        // Cancelar la orden
        this.ordenService.cancelarOrden(this.idOrdenCreada!).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Pedido Cancelado',
              text: 'El pedido ha sido cancelado exitosamente.',
              customClass: {
                popup: 'swal-popup-premium',
                title: 'swal-title-premium',
                htmlContainer: 'swal-html-container-premium',
                confirmButton: 'swal-confirm-button-premium'
              },
              buttonsStyling: false
            });
            this.mostrarBotonCancelar = false;

            // 🔹 Si el pedido tenía mesa asociada, liberarla
            if (mesaId) {
              console.log('🔓 Liberando mesa ID:', mesaId);
              this.mesaService.actualizarEstadoMesa(mesaId, 'Libre').subscribe({
                next: () => {
                  console.log('✅ Mesa liberada correctamente');
                  // Actualizar el estado local de la mesa si existe
                  const mesa = this.mesas.find(m => m.id === mesaId);
                  if (mesa) {
                    mesa.status = 'Libre';
                  }
                },
                error: err => console.error('❌ Error al liberar mesa:', err)
              });
            }
          },
          error: (err) => {
            console.error('Error al cancelar la orden:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo cancelar el pedido. Inténtalo de nuevo.',
              customClass: {
                popup: 'swal-popup-premium',
                title: 'swal-title-premium',
                htmlContainer: 'swal-html-container-premium',
                confirmButton: 'swal-confirm-button-premium'
              },
              buttonsStyling: false
            });
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener detalles de la orden:', err);
      }
    });
  }


  generarPDF() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]  // 80mm de ancho, alto dinámico
    });

    let y = 10; // posición vertical inicial

    doc.setFontSize(12);
    doc.text('*** Mi Restaurante ***', 40, y, { align: 'center' });
    y += 6;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 5, y);
    y += 5;

    doc.text('Mesa: ' + this.mesaSeleccionada, 5, y);
    y += 5;

    doc.line(5, y, 75, y); // línea separadora
    y += 4;

    doc.text('Productos:', 5, y);
    y += 5;

    this.carrito.forEach(item => {
      const nombreProducto = item.name.length > 18 ? item.name.substring(0, 18) + '…' : item.name;
      doc.text(`${nombreProducto} x${item.cantidad}`, 5, y);
      doc.text(`$${(item.price * item.cantidad).toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    });

    doc.line(5, y, 75, y);
    y += 4;

    doc.text('Subtotal:', 5, y);
    doc.text(`$${this.getSubtotal()}`, 60, y, { align: 'right' });
    y += 5;

    doc.text('Propina 10%:', 5, y);
    doc.text(`$${this.getPropina()}`, 60, y, { align: 'right' });
    y += 5;

    doc.setFontSize(11);
    doc.text('TOTAL:', 5, y);
    doc.text(`$${this.getTotal() + this.getPropina()}`, 60, y, { align: 'right' });
    y += 6;

    doc.setFontSize(9);
    doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });

    doc.save('ticket_venta.pdf');
  }

  actualizarMesa(mesaId: number, mesa: UpdateMesaDto): void {
    this.mesaService.update(mesaId, mesa).subscribe({
      next: (data: Mesa) => {
        console.log('Mesa actualizada:', data);
        // Opcional: mostrar un mensaje, redirigir, etc.
      },
      error: (error) => {
        console.error('Error al actualizar la mesa:', error);
      }
    });
  }

  actualizarEstadoMesa(mesaId: number, nuevoEstado: string) {
    this.mesaService.actualizarEstadoMesa(mesaId, nuevoEstado).subscribe({
      next: (respuesta) => {
        console.log('Estado mesa actualizado:', respuesta);

        // Notificamos a otros componentes que las mesas cambiaron
        this.mesaService.notificarCambioMesas();
      },
      error: (error) => {
        console.error('Error actualizando estado mesa:', error);
      }
    });
  }

  ocuparMesa(mesaId: number) {
    this.mesaService.actualizarEstadoMesa(mesaId, 'Ocupada').subscribe();
  }

  cambiarEstadoMesa(mesaId: number, estado: string) {
    this.store.dispatch(MesasActions.actualizarMesaEstado({ mesaId, estado }));
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    // convierte el número a string con separador de miles
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  handleImageError(event: any) {
    event.target.src = 'https://via.placeholder.com/150?text=No+Image';
  }

  all() {
    this.productService.getProducts().subscribe({
      next: data => this.productos = data,
      error: err => console.error('Error al buscar productos:', err)
    });
  }

  getMesaSeleccionada(): Mesa | undefined {
    if (!this.mesaSeleccionada) return undefined;
    return this.mesas.find(m => m.id === this.mesaSeleccionada);
  }

  seleccionarMesa(mesa: any) {
    if (mesa.status.toLowerCase() === 'ocupada') {
      Swal.fire({
        icon: 'warning',
        title: 'Mesa Ocupada',
        text: '⛔ Esta mesa está ocupada. No puedes agregar productos.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d33',
        background: '#ffffff',
        color: '#000000',
        customClass: {
          popup: 'swal-popup-premium',
          title: 'swal-title-premium',
          htmlContainer: 'swal-html-container-premium',
          confirmButton: 'swal-confirm-button-premium'
        },
        buttonsStyling: false
      });
      return; // detiene la selección
    }

    this.mesaSeleccionada = mesa.id;

    Swal.fire({
      icon: 'success',
      title: 'Mesa Seleccionada ✅',
      text: `Has seleccionado la mesa ${mesa.numero_mesa}`,
      timer: 1200,
      showConfirmButton: false,
      background: '#ffffff',
      color: '#000000',
      customClass: {
        popup: 'swal-popup-premium',
        title: 'swal-title-premium',
        htmlContainer: 'swal-html-container-premium',
        confirmButton: 'swal-confirm-button-premium'
      },
      buttonsStyling: false
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;

    // Espera un ciclo de Angular para que la pestaña se active
    setTimeout(() => {
      if (tab === 'pendientes' && this.pendientesComponent) {
        this.pendientesComponent.loadPendientes();
      }
    }, 0);
  }

  ngAfterViewInit() {
    const tabs = document.querySelectorAll('a[data-bs-toggle="pill"]');

    tabs.forEach(tab => {
      tab.addEventListener('shown.bs.tab', (event: any) => {
        if (event.target.getAttribute('href') === '#pendientes') {
          this.pendientesComponent.loadPendientes();
        }
      });
    });
  }

  /**
   * Verifica si el icono es un Bootstrap Icon (empieza con 'bi-')
   */
  isBootstrapIcon(icono: string): boolean {
    return !!icono && icono.startsWith('bi-');
  }

  /**
   * Obtiene la clase CSS completa para mostrar el icono Bootstrap
   */
  getIconClass(icono: string): string {
    if (!icono) return '';
    if (icono.startsWith('bi-')) {
      return 'bi ' + icono;
    }
    return '';
  }

  // ==========================================
  // 🔍 BÚSQUEDA Y ORDENAMIENTO
  // ==========================================

  /**
   * Filtra productos por nombre
   */
  filtrarProductos(): void {
    this.aplicarFiltrosYOrden();
  }

  /**
   * Ordena productos por precio
   */
  ordenarPorPrecio(orden: 'asc' | 'desc'): void {
    this.ordenActual = this.ordenActual === orden ? null : orden;
    this.aplicarFiltrosYOrden();
  }

  /**
   * Limpia el filtro de búsqueda y muestra todos los productos
   */
  limpiarFiltro(): void {
    this.filtro = '';
    this.ordenActual = null;
    this.aplicarFiltrosYOrden(); // 🔹 Filtrado local instantáneo (no llamar a buscar())
  }

  /**
   * Resetea todos los filtros
   */
  resetearFiltros(): void {
    this.filtro = '';
    this.ordenActual = null;
    this.aplicarFiltrosYOrden(); // 🔹 Filtrado local instantáneo
  }

  /**
   * Aplica filtros y ordenamiento a los productos
   */
  private aplicarFiltrosYOrden(): void {
    // 🔹 Usar siempre la copia maestra como fuente
    let resultado = [...this.allProducts];

    // Filtrar por nombre
    if (this.filtro) {
      const filtroLower = this.filtro.toLowerCase();
      resultado = resultado.filter(p =>
        p.name?.toLowerCase().includes(filtroLower) ||
        p.description?.toLowerCase().includes(filtroLower)
      );
    }

    // Ordenar por precio
    if (this.ordenActual === 'asc') {
      resultado.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.ordenActual === 'desc') {
      resultado.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    this.productosFiltrados = resultado;
    this.productos = resultado;
  }

  // ==========================================
  // 🍺 BAR MODULE - MÉTODOS
  // ==========================================

  /**
   * Agregar producto al carrito del bar
   */
  agregarAlCarritoBar(producto: Producto): void {
    const item = this.carritoBar.find(p => p.id === producto.id);
    if (item) {
      item.cantidad++;
    } else {
      this.carritoBar.push({ ...producto, cantidad: 1 });
    }
  }

  /**
   * Eliminar/decrementar producto del carrito bar (resta 1 a la cantidad)
   */
  eliminarDelCarritoBar(id: number): void {
    const item = this.carritoBar.find(p => p.id === id);
    if (item) {
      if (item.cantidad > 1) {
        item.cantidad--;
      } else {
        this.carritoBar = this.carritoBar.filter(p => p.id !== id);
      }
    }
  }

  /**
   * Incrementar cantidad de un producto en el carrito bar
   */
  incrementarCantidadBar(id: number): void {
    const item = this.carritoBar.find(p => p.id === id);
    if (item) {
      item.cantidad++;
    }
  }

  /**
   * Eliminar completamente un producto del carrito bar
   */
  eliminarProductoCompletoBar(id: number): void {
    this.carritoBar = this.carritoBar.filter(p => p.id !== id);
  }

  /**
   * Obtener total del carrito bar
   */
  getTotalBar(): number {
    return this.carritoBar.reduce((total, item) => total + item.price * item.cantidad, 0);
  }

  /**
   * Obtener cantidad total de items en carrito bar
   */
  getCantidadTotalBar(): number {
    return this.carritoBar.reduce((total, item) => total + item.cantidad, 0);
  }

  /**
   * Limpiar carrito bar
   */
  limpiarCarritoBar(): void {
    this.carritoBar = [];
    // NO resetear tipoTicketSeleccionado ni la sesión activa aquí
  }

  /**
   * Limpiar toda la sesión de ticket activo
   */
  limpiarSesionCompleta(): void {
    this.carritoBar = [];
    this.productosEnSesion = [];
    this.sesionTicketIds = [];
    this.ticketNormalActivo = false;
    this.tipoTicketSeleccionado = 'normal';
    this.tipoTicketSesion = 'normal';
    this.barSessionId = 0;
    this.propinaSesionActual = 0; // 💰 Resetear propina de sesión
  }

  /**
   * Obtener total de productos en la sesión activa
   */
  getTotalSesion(): number {
    return this.productosEnSesion.reduce((total, item) => total + item.price * item.cantidad, 0);
  }

  /**
   * Enviar ticket de bar - con soporte para acumulación de tickets normales
   */
  enviarTicketBar(): void {
    if (this.carritoBar.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'Agrega productos al carrito antes de enviar',
        background: '#1a1a2e',
        color: '#ffffff',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Para tickets RÁPIDOS: comportamiento original (enviar y cerrar)
    if (this.tipoTicketSeleccionado === 'rapido') {
      this.enviarTicketRapido();
      return;
    }

    // Para tickets NORMALES: iniciar o agregar a sesión
    if (!this.ticketNormalActivo) {
      this.iniciarTicketNormal();
    } else {
      this.agregarMasProductos();
    }
  }

  /**
   * Enviar ticket rápido (cerrar inmediatamente)
   */
  private enviarTicketRapido(): void {
    this.enviandoTicketBar = true;

    // 💰 Calcular propina total y distribuirla proporcionalmente
    const propinaTotal = this.getPropinaBar();
    const totalSinPropina = this.getTotalBar();

    const promesas = this.carritoBar.map(item => {
      const subtotalItem = item.price * item.cantidad;
      // Calcular propina proporcional para este producto
      const propinaProporcional = totalSinPropina > 0
        ? Math.round((subtotalItem / totalSinPropina) * propinaTotal)
        : 0;

      const dto: CreateTicketBarDto = {
        tipoTicket: 'rapido',
        totalTicket: subtotalItem, // Total sin propina
        propinaBar: propinaProporcional, // 💰 Propina proporcional
        estadoTicket: 1, // Cerrado inmediatamente
        idProduct: item.id,
        cantidad: item.cantidad
      };
      return this.ticketBarService.create(dto).toPromise();
    });

    Promise.all(promesas)
      .then(() => {
        this.enviandoTicketBar = false;
        Swal.fire({
          icon: 'success',
          title: '⚡ Ticket Rápido Enviado',
          html: `
            <div style="text-align: center;">
              <p class="mb-2">Subtotal: <strong>${this.formatPrice(this.getTotalBar())}</strong></p>
              <p class="mb-2">Propina: <strong>${this.formatPrice(propinaTotal)}</strong></p>
              <p class="mb-2">Total: <strong>${this.formatPrice(this.getTotalBar() + propinaTotal)}</strong></p>
              <p class="text-muted small">${this.carritoBar.length} producto(s)</p>
            </div>
          `,
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#ffffff'
        });
        this.limpiarCarritoBar();
        this.cargarTicketsBar();
      })
      .catch((error) => {
        this.enviandoTicketBar = false;
        console.error('Error al crear ticket rápido:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo crear el ticket. Intenta de nuevo.',
          background: '#1a1a2e',
          color: '#ffffff',
          confirmButtonColor: '#f5576c'
        });
      });
  }

  /**
   * Iniciar una nueva sesión de ticket normal
   */
  iniciarTicketNormal(): void {
    // Generar ID único para esta nueva sesión (timestamp para referencia)
    this.barSessionId = Date.now() % 1000000;
    this.enviandoTicketBar = true;

    // 💰 Calcular propina total y distribuirla proporcionalmente
    const propinaTotal = this.getPropinaBar();
    const totalSinPropina = this.getTotalBar();
    this.propinaSesionActual = propinaTotal;

    const promesas = this.carritoBar.map(item => {
      const subtotalItem = item.price * item.cantidad;
      // Calcular propina proporcional para este producto
      const propinaProporcional = totalSinPropina > 0
        ? Math.round((subtotalItem / totalSinPropina) * propinaTotal)
        : 0;

      const dto: CreateTicketBarDto = {
        tipoTicket: 'normal',
        totalTicket: subtotalItem, // Total sin propina
        propinaBar: propinaProporcional, // 💰 Propina proporcional REAL
        estadoTicket: 0, // Abierto
        idProduct: item.id,
        cantidad: item.cantidad
      };
      return this.ticketBarService.create(dto).toPromise();
    });

    Promise.all(promesas)
      .then((tickets: any[]) => {
        this.enviandoTicketBar = false;

        Swal.fire({
          icon: 'success',
          title: '📋 Ticket Normal Creado',
          html: `
            <div style="text-align: center;">
              <p class="mb-2">Subtotal: <strong>${this.formatPrice(totalSinPropina)}</strong></p>
              <p class="mb-2">Propina: <strong>${this.formatPrice(propinaTotal)}</strong></p>
              <p class="mb-2">Total: <strong>${this.formatPrice(totalSinPropina + propinaTotal)}</strong></p>
              <p class="text-muted small">Ticket normal abierto</p>
            </div>
          `,
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#ffffff'
        });

        // Limpiar todo para permitir crear otro ticket nuevo
        this.limpiarSesionCompleta();
        this.cargarTicketsBar();
      })
      .catch((error) => {
        this.enviandoTicketBar = false;
        console.error('Error al crear ticket normal:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo crear el ticket. Intenta de nuevo.',
          background: '#1a1a2e',
          color: '#ffffff',
          confirmButtonColor: '#f5576c'
        });
      });
  }

  /**
   * Agregar más productos a la sesión de ticket normal activa
   */
  agregarMasProductos(): void {
    if (!this.ticketNormalActivo) {
      this.iniciarTicketNormal();
      return;
    }

    this.enviandoTicketBar = true;

    // 💰 Calcular propina adicional para los nuevos productos
    const propinaAdicional = this.getPropinaBar();
    const totalSinPropina = this.getTotalBar();

    const promesas = this.carritoBar.map(item => {
      const subtotalItem = item.price * item.cantidad;
      // Calcular propina proporcional para este producto
      const propinaProporcional = totalSinPropina > 0
        ? Math.round((subtotalItem / totalSinPropina) * propinaAdicional)
        : 0;

      const dto: CreateTicketBarDto = {
        tipoTicket: this.tipoTicketSesion, // Usar el tipo de la sesión activa
        totalTicket: subtotalItem, // Total sin propina
        propinaBar: propinaProporcional, // 💰 Propina proporcional REAL
        estadoTicket: 0, // Abierto
        idProduct: item.id,
        cantidad: item.cantidad
      };
      return this.ticketBarService.create(dto).toPromise();
    });

    Promise.all(promesas)
      .then((tickets: any[]) => {
        this.enviandoTicketBar = false;

        // Guardar IDs de nuevos tickets
        tickets.forEach(t => {
          if (t && t.idticketBar) {
            this.sesionTicketIds.push(t.idticketBar);
          }
        });

        // Acumular productos en la sesión
        this.carritoBar.forEach(item => {
          const existente = this.productosEnSesion.find(p => p.id === item.id);
          if (existente) {
            existente.cantidad += item.cantidad;
          } else {
            this.productosEnSesion.push({ ...item });
          }
        });

        // 💰 Acumular propina adicional
        this.propinaSesionActual += propinaAdicional;

        Swal.fire({
          icon: 'success',
          title: '✅ Productos Agregados',
          html: `
            <div style="text-align: center;">
              <p class="mb-2">+${this.carritoBar.length} producto(s) al ticket</p>
              <p class="mb-2">Subtotal acumulado: <strong>${this.formatPrice(this.getTotalSesion())}</strong></p>
              <p class="mb-2">Propina acumulada: <strong>${this.formatPrice(this.propinaSesionActual)}</strong></p>
              <p class="mb-2">Total: <strong>${this.formatPrice(this.getTotalSesion() + this.propinaSesionActual)}</strong></p>
              <p class="text-muted small">${this.productosEnSesion.length} producto(s) en total</p>
            </div>
          `,
          timer: 2500,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#ffffff'
        });

        this.carritoBar = [];
        // Limpiar sesión para salir del modo edición y permitir crear nuevos tickets
        this.limpiarSesionCompleta();
        this.cargarTicketsBar();
      })
      .catch((error) => {
        this.enviandoTicketBar = false;
        console.error('Error al agregar productos:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron agregar los productos.',
          background: '#1a1a2e',
          color: '#ffffff',
          confirmButtonColor: '#f5576c'
        });
      });
  }

  /**
   * Cerrar todos los tickets de la sesión activa
   */
  cerrarTicketNormal(): void {
    if (!this.ticketNormalActivo || this.sesionTicketIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin ticket activo',
        text: 'No hay un ticket normal abierto para cerrar',
        background: '#1a1a2e',
        color: '#ffffff'
      });
      return;
    }

    this.enviandoTicketBar = true;

    // 💰 La propina ya está incluida en los tickets (en el campo propinaBar)
    const propinaSesion = this.propinaSesionActual || 0;

    // Imprimir ticket de la sesión antes de cerrar
    const grupoSesion = {
      tipoTicket: 'normal',
      sessionId: this.barSessionId,
      createdAt: new Date(),
      totalGrupo: this.getTotalSesion(),
      propina: 12345,//propinaSesion, // 💰 Propina de la sesión
      productos: this.productosEnSesion.map(p => ({
        name: p.name,
        price: p.price,
        cantidad: p.cantidad,
        total: p.price * p.cantidad
      }))
    };
    this.imprimirTicketBar(grupoSesion);

    // Cerrar todos los tickets de la sesión
    const promesas = this.sesionTicketIds.map(id =>
      this.ticketBarService.cerrarTicket(id).toPromise()
    );

    Promise.all(promesas)
      .then(() => {
        this.enviandoTicketBar = false;

        Swal.fire({
          icon: 'success',
          title: '🎉 Ticket Cerrado',
          html: `
            <div style="text-align: center;">
              <p class="mb-2">Subtotal: <strong>${this.formatPrice(this.getTotalSesion())}</strong></p>
              <p class="mb-2">Propina: <strong>${this.formatPrice(propinaSesion)}</strong></p>
              <p class="mb-2">Total Final: <strong>${this.formatPrice(this.getTotalSesion() + propinaSesion)}</strong></p>
              <p class="text-muted small">${this.productosEnSesion.length} producto(s) en ${this.sesionTicketIds.length} entrada(s)</p>
            </div>
          `,
          timer: 3000,
          showConfirmButton: true,
          confirmButtonText: 'Perfecto',
          background: '#1a1a2e',
          color: '#ffffff',
          confirmButtonColor: '#667eea'
        });

        this.limpiarSesionCompleta();
        this.cargarTicketsBar();
      })
      .catch((error) => {
        this.enviandoTicketBar = false;
        console.error('Error al cerrar tickets:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cerrar los tickets.',
          background: '#1a1a2e',
          color: '#ffffff',
          confirmButtonColor: '#f5576c'
        });
      });
  }

  /**
   * Seleccionar tipo de ticket
   * Permite cambiar libremente entre normal y rápido aunque haya sesión activa
   */
  seleccionarTipoTicket(tipo: 'normal' | 'rapido'): void {
    this.tipoTicketSeleccionado = tipo;
  }

  /**
   * Reanudar un ticket abierto para seguir agregando productos
   * Carga el grupo de tickets en la sesión activa
   */
  reanudarTicketAbierto(grupo: any): void {
    if (grupo.estadoTicket !== 0) {
      Swal.fire({
        icon: 'info',
        title: 'Ticket Cerrado',
        text: 'Este ticket ya está cerrado y no se puede editar',
        background: '#1a1a2e',
        color: '#ffffff'
      });
      return;
    }

    // Si ya hay una sesión activa, preguntar qué hacer
    if (this.ticketNormalActivo && this.sesionTicketIds.length > 0) {
      Swal.fire({
        icon: 'question',
        title: 'Ya tienes un ticket activo',
        text: '¿Quieres cerrar el ticket actual y continuar con este?',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'No, mantener actual',
        background: '#1a1a2e',
        color: '#ffffff',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          this.cargarSesionDesdeGrupo(grupo);
        }
      });
      return;
    }

    this.cargarSesionDesdeGrupo(grupo);
  }

  /**
   * Cargar un grupo de tickets como sesión activa
   */
  private cargarSesionDesdeGrupo(grupo: any): void {
    // Limpiar sesión actual
    this.productosEnSesion = [];
    this.sesionTicketIds = [];

    // Cargar datos del grupo
    this.sesionTicketIds = [...grupo.ticketIds];
    this.productosEnSesion = grupo.productos.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.total / (p.cantidad || 1),
      description: '',
      imageUrl: '',
      categoryId: 0,
      cantidad: p.cantidad || 1
    }));

    // Activar la sesión con el tipo original del ticket
    this.ticketNormalActivo = true;
    this.tipoTicketSesion = grupo.tipoTicket || 'normal'; // Guardar tipo de la sesión
    this.tipoTicketSeleccionado = this.tipoTicketSesion;  // Sincronizar selector
    this.barSessionId = grupo.sessionId || 0;             // Recuperar ID de sesión para agrupación

    Swal.fire({
      icon: 'success',
      title: '📋 Ticket Reanudado',
      html: `
        <div style="text-align: center;">
          <p class="mb-2">Productos cargados: <strong>${this.productosEnSesion.length}</strong></p>
          <p class="mb-2">Total actual: <strong>${this.formatPrice(this.getTotalSesion())}</strong></p>
          <p class="text-muted small">Puedes agregar más productos</p>
        </div>
      `,
      timer: 2500,
      showConfirmButton: false,
      background: '#1a1a2e',
      color: '#ffffff'
    });

    // Scroll al carrito para que el usuario pueda agregar productos
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /**
   * Cargar historial de tickets de bar - SOLO DEL DÍA ACTUAL
   * Agrupa tickets creados en el mismo minuto como una misma sesión
   */
  cargarTicketsBar(): void {
    this.cargandoTickets = true;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día

    this.ticketBarService.findAll().subscribe({
      next: (tickets) => {
        // Filtrar solo tickets del día actual
        this.ticketsBar = tickets.filter((ticket: any) => {
          if (!ticket.createdAt) return false; // Sin fecha = no mostrar (tickets antiguos)
          const fechaTicket = new Date(ticket.createdAt);
          fechaTicket.setHours(0, 0, 0, 0);
          return fechaTicket.getTime() === hoy.getTime();
        });

        // Agrupar tickets por tiempo de creación (mismo minuto = misma sesión)
        this.ticketsBarAgrupados = this.agruparTicketsPorSesion(this.ticketsBar);

        this.cargandoTickets = false;
        console.log('✅ Tickets de bar del día cargados:', this.ticketsBar.length);
        console.log('✅ Tickets agrupados:', this.ticketsBarAgrupados.length);
      },
      error: (err) => {
        console.error('Error al cargar tickets de bar:', err);
        this.cargandoTickets = false;
      }
    });
  }

  /**
   * Agrupa tickets por sesión
   * - Tickets ABIERTOS: se agrupan por minuto de creación (tickets creados al mismo tiempo)
   * - Tickets CERRADOS: se agrupan por minuto de creación
   * - La propina ahora SIEMPRE está en el campo propinaBar y se acumula correctamente
   */
  private agruparTicketsPorSesion(tickets: any[]): any[] {
    const grupos: Map<string, any> = new Map();

    tickets.forEach(ticket => {
      let clave: string;
      const fecha = new Date(ticket.createdAt);

      // Agrupar todos los tickets (abiertos y cerrados) por minuto de creación + tipo
      clave = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}-${fecha.getHours()}-${fecha.getMinutes()}-${ticket.tipoTicket}-${ticket.estadoTicket}`;

      if (grupos.has(clave)) {
        // Agregar producto al grupo existente
        const grupo = grupos.get(clave);
        grupo.productos.push({
          id: ticket.idProduct,
          name: ticket.product?.name || 'Producto #' + ticket.idProduct,
          cantidad: ticket.cantidad || 1,
          total: ticket.totalTicket
        });
        grupo.totalGrupo += ticket.totalTicket || 0;
        grupo.ticketIds.push(ticket.idticketBar);

        // 💰 Acumular propina REAL del campo propinaBar
        if (ticket.propinaBar) {
          grupo.propina = (grupo.propina || 0) + ticket.propinaBar;
        }

        // Mantener la fecha más reciente para ordenar
        if (new Date(ticket.createdAt) > new Date(grupo.createdAt)) {
          grupo.createdAt = ticket.createdAt;
        }
      } else {
        // 💰 La propina siempre viene en el campo propinaBar
        const propina = ticket.propinaBar || 0;

        // Crear nuevo grupo
        grupos.set(clave, {
          id: clave,
          tipoTicket: ticket.tipoTicket,
          estadoTicket: ticket.estadoTicket,
          sessionId: Math.floor(new Date(ticket.createdAt).getTime() / 1000), // Timestamp como referencia
          createdAt: ticket.createdAt,
          totalGrupo: ticket.totalTicket || 0,
          propina: propina, // 💰 Propina REAL del ticket
          ticketIds: [ticket.idticketBar],
          productos: [{
            id: ticket.idProduct,
            name: ticket.product?.name || 'Producto #' + ticket.idProduct,
            cantidad: ticket.cantidad || 1,
            total: ticket.totalTicket
          }]
        });
      }
    });

    // Convertir Map a array y ordenar por fecha (más recientes primero)
    return Array.from(grupos.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Cerrar un grupo de tickets (todos los de una sesión)
   */
  /**
   * Cerrar un grupo de tickets (todos los de una sesión)
   */
  cerrarGrupoTickets(grupo: any): void {
    if (!grupo || !grupo.ticketIds || grupo.ticketIds.length === 0) return;

    // 💰 La propina ya está en el grupo (acumulada del campo propinaBar)
    // No necesitamos recuperarla de localStorage

    // Imprimir ticket antes de cerrar
    this.imprimirTicketBar(grupo);

    const ticketIds = grupo.ticketIds;
    this.enviandoTicketBar = true;

    const promesas = ticketIds.map((id: number) =>
      this.ticketBarService.cerrarTicket(id).toPromise()
    );

    Promise.all(promesas)
      .then(() => {
        this.enviandoTicketBar = false;

        // Calcular totales con propina
        const propina = grupo.propina || 0;
        const subtotal = grupo.totalGrupo || 0;
        const total = subtotal + propina;

        Swal.fire({
          icon: 'success',
          title: 'Ticket Cerrado e Impreso',
          html: `
            <div style="text-align: center;">
              <p class="mb-2">Subtotal: <strong>${this.formatPrice(subtotal)}</strong></p>
              ${propina > 0 ? `<p class="mb-2">Propina: <strong>${this.formatPrice(propina)}</strong></p>` : ''}
              <p class="mb-2">Total: <strong>${this.formatPrice(total)}</strong></p>
            </div>
          `,
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#ffffff'
        });

        // Si los tickets cerrados formaban parte de la sesión activa, limpiarla del carrito
        const esSesionActiva = this.ticketNormalActivo &&
          ticketIds.some((id: number) => this.sesionTicketIds.includes(id));

        if (esSesionActiva) {
          this.limpiarSesionCompleta();
        }

        this.cargarTicketsBar();
      })
      .catch((err) => {
        this.enviandoTicketBar = false;
        console.error('Error al cerrar tickets:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cerrar el ticket',
          background: '#1a1a2e',
          color: '#ffffff'
        });
      });
  }

  /**
   * Obtener fecha de hoy formateada
   */
  getFechaHoy(): string {
    return new Date().toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Imprimir ticket de bar (Caja y Cocina)
   */
  imprimirTicketBar(grupo: any): void {
    if (!grupo) return;

    // 💰 Obtener propina del grupo
    const propina = grupo.propina || 0;

    // Mapear grupo de tickets de bar a estructura de pedido para PrintService
    const pedido = {
      createdAt: grupo.createdAt,
      mesa: { numero_mesa: `BAR ${grupo.tipoTicket.toUpperCase()} #${grupo.sessionId || ''}` },
      tableNumber: `BAR ${grupo.tipoTicket.toUpperCase()}`,
      numeroVenta: grupo.sessionId || Math.floor(Date.now() / 1000),
      total: grupo.totalGrupo, //grupo.totalGrupo + propina, // 💰 Total con propina
      propina: 456789,//propina, // 💰 Propina real
      orderProducts: grupo.productos.map((p: any) => ({
        product: { name: p.name, price: p.price },
        cantidad: p.cantidad,
        precioUnitario: p.price,
        subtotal: p.total || (p.price * p.cantidad)
      }))
    };

    console.log('🖨️ Imprimiendo ticket de bar:', pedido);

    // Generar tickets
    this.printService.generarTicketCaja(pedido);

  }

  /**
   * Obtener total de consumo del bar (solo tickets cerrados del día)
   */
  getTotalConsumoBar(): number {
    return this.ticketsBar
      .filter(t => t.estadoTicket === 1) // Solo sumar tickets cerrados
      .reduce((total, ticket) => total + (ticket.totalTicket || 0), 0);
  }

  /**
   * Obtener cantidad de tickets abiertos (agrupados)
   */
  getTicketsAbiertos(): number {
    return this.ticketsBarAgrupados.filter(g => g.estadoTicket === 0).length;
  }

  /**
   * Obtener cantidad de tickets cerrados (agrupados)
   */
  getTicketsCerrados(): number {
    return this.ticketsBarAgrupados.filter(g => g.estadoTicket === 1).length;
  }

  /**
   * Cerrar un ticket
   */
  cerrarTicket(id: number): void {
    this.ticketBarService.cerrarTicket(id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Ticket cerrado',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a2e',
          color: '#ffffff'
        });
        this.cargarTicketsBar();
      },
      error: (err) => {
        console.error('Error al cerrar ticket:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cerrar el ticket',
          background: '#1a1a2e',
          color: '#ffffff'
        });
      }
    });
  }

  /**
   * Scroll the category carousel left or right
   */
  scrollCarousel(direction: 'left' | 'right'): void {
    if (this.carousel && this.carousel.nativeElement) {
      const scrollAmount = 200; // pixels to scroll
      const currentScroll = this.carousel.nativeElement.scrollLeft;

      if (direction === 'left') {
        this.carousel.nativeElement.scrollTo({
          left: currentScroll - scrollAmount,
          behavior: 'smooth'
        });
      } else {
        this.carousel.nativeElement.scrollTo({
          left: currentScroll + scrollAmount,
          behavior: 'smooth'
        });
      }
    }
  }

  /**
   * Scroll to top of the page
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Logout - Clear authentication and redirect to login
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['']);
  }
  // 💰 Propina Bar Logic
  incluirPropinaBar: boolean = false;
  propinaManualBar: number = 0;

  getPropinaBar(): number {
    if (this.incluirPropinaBar) {
      return this.getPropinaSugerida();
    }
    return this.propinaManualBar || 0;
  }

  getPropinaSugerida(): number {
    return Math.round(this.getTotalBar() * 0.1);
  }

  getTotalPagarBar(): number {
    return this.getTotalBar() + this.getPropinaBar();
  }
}
