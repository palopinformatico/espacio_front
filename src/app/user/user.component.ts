import { CommonModule, DecimalPipe, NgIfContext } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { CategoriaService } from '../services/categoria.service';
import { OrdenService } from '../services/orden.service';
import { DeliveryComponent } from "./delivery/delivery.component";
import { HeaderComponent } from '../header/header.component';
import jsPDF from 'jspdf';
import { CreateMesaDto, Mesa, MesaService } from '../services/mesa.service';

import autoTable from 'jspdf-autotable';
import { HorariosService } from '../services/horarios.service';
import { DisponibilidadService } from '../services/disponibilidad.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { SocketService } from '../services/socket.service';
import Swal from 'sweetalert2';


export interface CreateOrderDto {
  tableNumber: number;
  orderType: string;
  status: string;
  total: number;
  createdAt?: Date;
  paymentMethod: string;
  userId?: number;
  customerId?: number;
  productId?: number;
  propinaId?: number;

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
  selector: 'app-user',
  standalone: true,
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule, NgbModule, DeliveryComponent, HeaderComponent],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private socketService = inject(SocketService);
  private horariosService = inject(HorariosService);
  private disponibilidadService = inject(DisponibilidadService);
  private mesaService = inject(MesaService);
  private categoriaService = inject(CategoriaService);
  private ordenService = inject(OrdenService);
  private router = inject(Router);

  detalle!: string;
  private subs: Subscription[] = [];
  private destroy$ = new Subject<void>();
  deliveryEnabled = false;
  localEnabled = false;
  disponibilidadMensaje = '';
  @ViewChild('carousel', { static: false }) carousel!: ElementRef;
  mesas: Mesa[] = [];
  mesaSeleccionada: number | '' = '';
  vacio!: TemplateRef<NgIfContext<boolean>> | null;
  orderType = 'local';
  enviandoPedido = false; // Para prevenir doble clic y mostrar estado de carga
  showScrollButton = false; // Para botón scroll to top


  ngOnInit(): void {
    this.buscar();
    this.categoria();
    this.cargarMesas();
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

    // Verificar disponibilidad usando el nuevo servicio
    this.disponibilidadService.verificarDisponibilidad().subscribe(
      status => {
        this.localEnabled = status.localDisponible;
        this.deliveryEnabled = status.deliveryDisponible;
        this.disponibilidadMensaje = status.mensaje || '';
        
        // Si ambos servicios están deshabilitados, mostrar mensaje
        if (!this.localEnabled && !this.deliveryEnabled) {
          this.mostrarMensajeDisponibilidad(this.disponibilidadMensaje);
        }
      },
      error => {
        console.error('Error al verificar disponibilidad:', error);
        // En caso de error, habilitar todo por defecto
        this.localEnabled = true;
        this.deliveryEnabled = true;
      }
    );

    // 🔔 Suscribirse a cambios de órdenes para sincronización automática (RxJS)
    this.ordenService.ordenesActualizadas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 UserComponent: Recargando mesas por cambio en órdenes (RxJS)...');
        this.cargarMesas();
      });
  }

  /**
   * Scroll suavemente al inicio de la página
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  mostrarBotonCancelar = false;

  historialPedidos: {
    fecha: string;
    productos: ProductoCarrito[];
    total: number;
  }[] = [];
  sid: number | null = null;
  // ... inside UserComponent class ...
  allProducts: any[] = []; // 🔹 Copia maestra de productos para filtrar localmente
  productos: any[] = [];
  categorias: any[] = [];

  // ... (otros métodos) ...

  buscar(): void {
    // 🔹 Ya no enviamos `this.filtro` al backend para obtener la lista completa y filtrar localmente
    this.productService.buscarProductos({
      nombre: '', // Traer todo
      categoryIds: this.sid ? [this.sid] : undefined,
      limit: 1000
    }).subscribe((resp: any) => {
      this.allProducts = resp.data || []; // Guardar en copia maestra
      this.aplicarFiltrosYOrden(); // Aplicar filtro local inicial
    });
  }

  // ... (otros métodos) ...

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

  nombre = '';
  selectedCategories: number[] = [];
  paginaActual = 1;
  limite = 8;
  item?: ProductoCarrito;
  carrito: ProductoCarrito[] = [];
  carritos: ProductoCarrito[] = [];
  filtro = '';
  productosFiltrados: any[] = [];
  ordenActual: 'asc' | 'desc' | null = null;

  categoriaSeleccionada: number | null = null;
  // Variables para el carrusel
  currentIndex = 0;
  itemsPerPage = 4;
  totalItems = 0;
  pageSize = 4;
  page = 1;

  nuevaMesa: CreateMesaDto = {
    numero_mesa: '',
    status: '',
  };
  idOrdenCreada: number | null = null;
  // Variables para las categorías
  categories = ['Platos', 'Desayuno', 'Pizza', 'Sandwich', 'Bebidas', 'Postres', 'Ensaladas', 'Combos', 'Sopas'];
  activeTab = 'local';



  setActiveTab(tab: string): void {
    // Validar disponibilidad antes de cambiar de tab
    if (tab === 'local' && !this.localEnabled) {
      this.mostrarMensajeDisponibilidad('El servicio para consumo en local no está disponible en este momento.');
      return;
    }
    
    if (tab === 'delivery' && !this.deliveryEnabled) {
      this.mostrarMensajeDisponibilidad('El servicio de delivery no está disponible en este momento.');
      return;
    }
    
    this.activeTab = tab;
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);



  constructor() { }
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  seleccionarCategoria() {
    // this.categoriaSeleccionada = this.categorias[2];
  }
  title = 'espacio';


  search(activeTab: string) {
    this.activeTab = activeTab;
  }

  result(activeTab: string) {
    this.activeTab = activeTab;
  }

  cargarMesas(): void {
    this.mesaService.findAll().subscribe((data) => {
      if (Array.isArray(data)) {
        this.mesas = data;
      } else {
        console.error('Expected array of mesas but got:', data);
        this.mesas = [];
      }
    });
  }




  scrollCarousel(direction: 'left' | 'right') {
    const element = this.carousel.nativeElement;
    const scrollAmount = 1000;

    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
  toggleCategoria(id: number) {
    const index = this.selectedCategories.indexOf(id);

    if (index >= 0) {
      // Si ya estaba seleccionada, la quitamos
      this.selectedCategories.splice(index, 1);
    } else {
      // Si no estaba seleccionada, la agregamos
      this.selectedCategories.push(id);
    }

    // Llamar al servicio con todas las categorías seleccionadas
    this.buscarxcategoria(id);
  }

  buscarxcategoria(id: number): void {
    this.sid = id === 0 ? null : id;
    this.paginaActual = 1; // reiniciar a la primera página al cambiar de categoría
    this.buscar();
  }





  paginaSiguiente() {
    this.paginaActual++;
    this.buscar();
  }

  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.buscar();
    }
  }





  categoria(): void {
    this.categoriaService.obtenerCategorias().subscribe({
      next: data => this.categorias = data,
      error: err => alert('Error al buscar productos: ' + err)
    });
  }



  agregarAlCarrito(producto: Producto) {
    this.item = this.carrito.find(p => p.id === producto.id);
    if (this.item) {
      this.item.cantidad++;
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

  getTotals(): number {
    return this.carrito.reduce((total, item) => total + item.price * item.cantidad, 0);
  }

  getCantidadTotal(): number {
    return this.carrito.reduce((total, item) => total + item.cantidad, 0);
  }



  aceptarPedido() {
    // Validar disponibilidad del servicio local
    if (!this.localEnabled) {
      Swal.fire({
        icon: 'warning',
        title: 'Servicio No Disponible',
        text: 'El servicio para consumo en local no está disponible en este momento. Por favor intenta más tarde.',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
      });
      return;
    }

    // Prevenir doble clic
    if (this.enviandoPedido) {
      Swal.fire({
        icon: 'info',
        title: 'Procesando...',
        text: 'Ya se está enviando un pedido, por favor espera.',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
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
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
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
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
      });
      return;
    }


    const pedido = {
      orderType: this.orderType,
      status: 'pendiente',
      mesaId: Number(this.mesaSeleccionada), // ✅ Convertir a número
      detalle_venta: this.detalle?.trim() || null,
      paymentMethod: '', // si es opcional
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
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.ordenService.createOrder(pedido).subscribe({
      next: () => {
        this.enviandoPedido = false; // Desactivar estado de carga
        Swal.fire({
          icon: 'success',
          title: 'Orden Registrada ✅',
          text: 'Orden registrada correctamente',
          timer: 1500,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-legible',
            title: 'swal-title-legible',
            htmlContainer: 'swal-text-legible'
          }
        });
        // Limpiar carrito
        this.carrito = [];
        this.mesaSeleccionada = 0;
        this.detalle = '';
      },
      error: (err: any) => {
        this.enviandoPedido = false; // Desactivar estado de carga
        console.error('❌ Error al crear orden:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al crear la orden: ' + (err.error?.message || err.message),
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-legible',
            title: 'swal-title-legible',
            htmlContainer: 'swal-text-legible'
          }
        });
      }
    });
  }

  aceptarPedidos() {
    const propina = this.getPropina();
    const mesa = this.mesaSeleccionada;
    const total = this.carrito.reduce((acc, item) => acc + item.price * item.cantidad, 0);

    if (this.carrito.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'El carrito está vacío',
        background: '#212529',
        color: '#ffffff',
        customClass: {
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
      });
      return;
    }

    const pedido = {
      tableNumber: Number(this.mesaSeleccionada),
      orderType: this.orderType,
      detalle_venta: this.detalle?.trim() || null,
      status: 'pendiente',
      paymentMethod: '',
      mesaId: Number(this.mesaSeleccionada),
      products: this.carrito.map(p => ({
        id: p.id,
        cantidad: p.cantidad
      }))
    };
    const carritoCopia = [...this.carrito];

    this.ordenService.createOrder(pedido).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Orden Registrada ✅',
          text: 'Orden registrada correctamente',
          timer: 1500,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-legible',
            title: 'swal-title-legible',
            htmlContainer: 'swal-text-legible'
          }
        });

        this.idOrdenCreada = res.id;
        this.mostrarBotonCancelar = true;

        // 🔹 Usamos carritoCopia, no this.carrito
        this.generarTicket(
          mesa ? mesa.toString() : 'Delivery',
          carritoCopia,
          total,
          propina,
          total + propina,
          this.detalle
        );
        this.carrito = [];
        this.detalle = '';
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al crear la orden: ' + err,
          background: '#ffffff',
          color: '#000000',
          customClass: {
            popup: 'swal-popup-legible',
            title: 'swal-title-legible',
            htmlContainer: 'swal-text-legible'
          }
        });
      }
    });
  }



  getSubtotal(): number {
    return this.carrito.reduce((acc, item) => acc + item.price * item.cantidad, 0);
  }

  getPropina(): number {
    return Math.round(this.getSubtotal() * 0.10);
  }



  onMesaChange() {
    this.cargarHistorial();
  }

  cargarHistorial() {
    if (!this.mesaSeleccionada) {
      this.historialPedidos = [];
      return;
    }
    const clave = `mesa_${this.mesaSeleccionada}`;
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
              text: 'Pedido cancelado exitosamente',
              timer: 1500,
              showConfirmButton: false,
              background: '#ffffff',
              color: '#000000',
              customClass: {
                popup: 'swal-popup-legible',
                title: 'swal-title-legible',
                htmlContainer: 'swal-text-legible'
              }
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
          error: () => {
            (err: any) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cancelar el pedido: ' + err,
                background: '#ffffff',
                color: '#000000',
                customClass: {
                  popup: 'swal-popup-legible',
                  title: 'swal-title-legible',
                  htmlContainer: 'swal-text-legible'
                }
              });
            }
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
    doc.text(`$${this.getTotals() + this.getPropina()}`, 60, y, { align: 'right' });
    y += 6;

    doc.setFontSize(9);
    doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });

    doc.save('ticket_venta.pdf');
  }

  login() {
    this.router.navigate(['/auth/entrar']);
  }


  generarTicket(
    mesa: string,
    carrito: any[],
    subtotal: number,
    propina: number,
    total: number,
    detalle: string
  ) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 200], // ticket de 80mm
    });

    const fecha = new Date().toLocaleString();

    // 🟠 Logo
    const img = new Image();
    img.src = './logo.png';

    img.onload = () => {
      // Logo centrado
      doc.addImage(img, 'PNG', 20, 5, 40, 20);

      // 🟠 Encabezado
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Boulevard Linares', 40, 28, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${fecha}`, 4, 38);
      doc.text(mesa ? `Mesa: ${mesa}` : 'Delivery', 4, 44);

      // 🟠 Tabla productos
      const body = carrito.map((item) => [
        item.name || item.nombre,
        (item.cantidad || 0).toString(),
        `$${item.price || item.precio}`,
        `$${(item.price || item.precio) * (item.cantidad || 0)}`,
      ]);


      autoTable(doc, {
        startY: 50,
        head: [['Producto', 'Cant', 'P.U', 'Total']],
        body,
        theme: 'plain',
        styles: { fontSize: 8 },
        headStyles: { fontSize: 8, fontStyle: 'bold', fillColor: [200, 200, 200] },
        columnStyles: {
          0: { cellWidth: 22 }, // Producto
          1: { cellWidth: 10, halign: 'center' }, // Cantidad
          2: { cellWidth: 13, halign: 'right' },  // P.Unit
          3: { cellWidth: 15, halign: 'right' },  // Total
        },
        tableWidth: 72 // ancho útil dentro del ticket
      });


      // 🟠 Totales
      const finalY = (doc as any).lastAutoTable?.finalY || 60;
      doc.setFontSize(9);
      doc.text(`Subtotal: $${subtotal}`, 70, finalY + 5, { align: 'right' });
      doc.text(`Propina: $${propina}`, 70, finalY + 10, { align: 'right' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: $${total}`, 70, finalY + 18, { align: 'right' });

      // 🟠 Nota cliente (si existe)
      if (detalle) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Nota:', 4, finalY + 28);
        doc.text(detalle, 4, finalY + 33, { maxWidth: 72 });
      }

      // 🟠 Pie
      doc.setFontSize(9);
      doc.text('¡Gracias por su compra!', 40, 190, { align: 'center' });

      // Guardar PDF
      doc.save('ticket.pdf');
    };
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    // convierte el número a string con separador de miles
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  handleImageError(event: any) {
    // Usar Data URI SVG local en lugar de URL externa para evitar errores de red
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';
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
          popup: 'swal-popup-legible',
          title: 'swal-title-legible',
          htmlContainer: 'swal-text-legible'
        }
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
        popup: 'swal-popup-legible',
        title: 'swal-title-legible',
        htmlContainer: 'swal-text-legible'
      }
    });
  }

  /**
   * Verifica si el icono es un Bootstrap Icon (empieza con 'bi-')
   */
  isBootstrapIcon(icono: string): boolean {
    return !!icono && icono.startsWith('bi-');
  }

  /**
   * Obtiene la ruta correcta del icono
   */
  getIconPath(icono: string): string {
    if (!icono) return '';
    // Si ya tiene el prefijo, usar tal cual
    if (icono.includes('restaurant-cafeterias/')) {
      return icono;
    }
    // Si es un Bootstrap Icon, no agregar prefijo
    if (icono.startsWith('bi-')) {
      return icono;
    }
    // Remover slash inicial si existe
    const cleanIcono = icono.startsWith('/') ? icono.substring(1) : icono;
    // Si no tiene prefijo y no es Bootstrap Icon, agregarlo
    return 'restaurant-cafeterias/' + cleanIcono;
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
   * Muestra un mensaje informativo sobre la disponibilidad del restaurante
   */
  private mostrarMensajeDisponibilidad(mensaje: string): void {
    Swal.fire({
      icon: 'info',
      title: 'Disponibilidad Limitada',
      text: mensaje,
      timer: 4000,
      showConfirmButton: true,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6',
      background: '#212529',
      color: '#ffffff',
      customClass: {
        popup: 'swal-popup-legible',
        title: 'swal-title-legible',
        htmlContainer: 'swal-text-legible'
      }
    });
  }

  /**
   * Aplica filtros y ordenamiento a los productos
   */


}