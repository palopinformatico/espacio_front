import { CommonModule, DecimalPipe, NgIfContext } from '@angular/common';
import { Component, ElementRef, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { CategoriaService } from '../../services/categoria.service';
import { OrdenService } from '../../services/orden.service';
import { ProductService } from '../../services/product.service';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { PrintService } from '../../services/print.service';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CostoEnvioService, CostoEnvio } from '../../services/costo-envio.service';
import { DisponibilidadService } from '../../services/disponibilidad.service';
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
  selector: 'app-delivery',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule],
  standalone: true,
  templateUrl: './delivery.component.html',
  providers: [DecimalPipe],
  styleUrl: './delivery.component.css'
})
export class DeliveryComponent implements OnInit {
  private productService = inject(ProductService);
  private decimalPipe = inject(DecimalPipe);
  private print = inject(PrintService);
  private categoriaService = inject(CategoriaService);
  private ordenService = inject(OrdenService);
  private costoEnvioService = inject(CostoEnvioService);
  private disponibilidadService = inject(DisponibilidadService);
  deliveryForm!: FormGroup;
  costosEnvio: CostoEnvio[] = [];
  costoEnvioSeleccionado: number = 0;
  metodoPagoSeleccionado: string = 'efectivo';
  @ViewChild('carousel', { static: false }) carousel!: ElementRef;
  selectedCategories: number[] = [];
  mesas: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  detalle = '';  // Para el mensaje extra
  mesaSeleccionada!: number;
  item!: ProductoCarrito | undefined;

  // Inicializar los campos de formulario como strings vacíos para evitar undefined
  pago: string = '';
  email: string = '';
  telefono: string = '';
  direccion: string = '';
  apellido: string = '';
  nombre: string = '';

  mesaSeleccionadas!: number;
  vacio!: TemplateRef<NgIfContext<boolean>> | null;
  orderType = 'delivery'; // Tipo de orden
  orders!: CreateOrderDto;
  enviandoPedido = false; // Para prevenir doble clic y mostrar estado de carga
  showScrollButton = false; // Para botón scroll to top
  deliveryDisponible = false; // Para verificar disponibilidad del servicio de delivery

  ngOnInit(): void {
    this.buscar();
    this.categoria();
    this.cargarCostosEnvio();

    // Verificar disponibilidad del servicio de delivery
    this.disponibilidadService.verificarDisponibilidadDelivery().subscribe(
      disponible => {
        this.deliveryDisponible = disponible;
        if (!disponible) {
          this.mostrarMensajeDeliveryNoDisponible();
        }
      },
      error => {
        console.error('Error al verificar disponibilidad de delivery:', error);
        // En caso de error, permitir por defecto
        this.deliveryDisponible = true;
      }
    );

    // Listener para botón scroll to top
    window.addEventListener('scroll', () => {
      this.showScrollButton = window.scrollY > 300;
    });

    this.deliveryForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      apellido: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      direccion: ['', Validators.required],
      telefono: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{8,12}$/) // sólo números, 8-12 dígitos
      ]],
      pago: ['', Validators.required],
      aceptoTerminos: [false, Validators.requiredTrue]
    });
  }

  /**
   * Scroll suavemente al inicio de la página
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }



  historialPedidos: {
    fecha: string;
    productos: ProductoCarrito[];
    total: number;
  }[] = [];
  carrito: ProductoCarrito[] = [];
  carritos: ProductoCarrito[] = [];
  filtro = '';
  productosFiltrados: any[] = [];
  ordenActual: 'asc' | 'desc' | null = null;
  sid: number | null = null;
  // Variables para el carrusel
  currentIndex = 0;
  itemsPerPage = 8;
  totalItems = 0;
  pageSize = 4;
  page = 1;
  productos: any[] = [];
  categorias: any[] = []; // Deberías cargarlas del backend

  paginaActual = 1;
  limite = 8;
  // Variables para las categorías
  categories = ['Platos', 'Desayuno', 'Pizza', 'Sandwich', 'Bebidas', 'Postres', 'Ensaladas', 'Combos', 'Sopas'];
  activeTab = 'local';

  producto: Producto[] = [];

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  filterProducts(category: string) {
    console.log(`Filtrando productos por categoría: ${category}`);
    // Lógica para filtrar productos por categoría
  }
  categoriaSeleccionada: any;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor(private fb: FormBuilder) { }

  seleccionarCategoria(categoria: string) {
    this.categoriaSeleccionada = this.categorias[2], this.products[0];
  }
  title = 'espacio';

  search(activeTab: string) {
    this.activeTab = activeTab;
  }

  result(activeTab: string) {
    this.activeTab = activeTab;
  }

  products = [
    {
      name: 'Lomo a lo Pobre',
      description:
        'Lomo de 200 grs acompañado de papas fritas, cebolla caramelizada y 2 huevos fritos',
      price: 12000,
      image: 'https://via.placeholder.com/150',
    },
    {
      name: 'Carne Mongoliana',
      description:
        'Carne de vacuno salteada con cebollín y salsa de soya, acompañada de arroz o papas fritas',
      price: 9900,
      image: 'https://via.placeholder.com/150',
    },
  ];

  cart = [
    { name: 'Lomo a lo Pobre', price: 12500 },
    { name: 'Bebida 350 cc', price: 1500 },
  ];

  get total() {
    return this.cart.reduce((acc, item) => acc + item.price, 0);
  }

  scrollCarousel(direction: 'left' | 'right') {
    const element = this.carousel.nativeElement;
    const scrollAmount = 300;

    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  buscarxcategoria(id: number): void {
    this.sid = id === 0 ? null : id;
    this.paginaActual = 1; // reiniciar a la primera página al cambiar de categoría
    this.buscar();
  }

  buscar(): void {
    this.productService.buscarProductos({
      nombre: this.filtro,
      categoryIds: this.sid ? [this.sid] : undefined,
      limit: 1000
    }).subscribe((resp: any) => {
      this.productos = resp.data || [];
      this.productosOriginales = resp.data || []; // Backup original data
      this.aplicarFiltrosYOrden(); // Re-apply any existing filters
    });
  }

  categoria(): void {
    this.categoriaService.obtenerCategorias().subscribe({
      next: data => this.categorias = data,
      error: err => console.error('Error al buscar productos:', err)
    });
  }

  cargarCostosEnvio(): void {
    this.costoEnvioService.obtenerCostosEnvio().subscribe({
      next: (data) => {
        this.costosEnvio = data;
        // Si hay al menos un costo de envío, seleccionar el primero por defecto
        if (this.costosEnvio.length > 0) {
          this.costoEnvioSeleccionado = this.costosEnvio[0].precio_envio;
        }
      },
      error: (err) => console.error('Error al cargar costos de envío:', err)
    });
  }

  // Removed duplicate getCantidadTotal

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

  getSubtotal(): number {
    return this.carrito.reduce((total, item) => total + item.price * item.cantidad, 0);
  }

  aceptarPedidos() {
    // Validar disponibilidad del servicio de delivery
    if (!this.deliveryDisponible) {
      Swal.fire({
        icon: 'warning',
        title: 'Servicio No Disponible',
        text: 'El servicio de delivery no está disponible en este momento. Por favor intenta más tarde.',
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

    // Validar que haya items
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

    // 🔹 Validar formulario
    console.log('Form status:', this.deliveryForm.status);
    console.log('Form values:', this.deliveryForm.value);
    console.log('Form errors:', this.deliveryForm.errors);

    // Log each control's status
    Object.keys(this.deliveryForm.controls).forEach(key => {
      const control = this.deliveryForm.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        errors: control?.errors
      });
    });

    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor complete todos los campos obligatorios del formulario.',
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

    // Si llegamos aquí, los campos requeridos están presentes
    const formValues = this.deliveryForm.value;
    const subtotal = this.getSubtotal();
    const propina = this.getPropina();
    const costoEnvio = this.getCostoEnvio();
    const total = subtotal + costoEnvio; // Incluir costo de envío en el total

    const pedido = {
      orderType: this.orderType || 'delivery',
      detalle_venta: this.detalle?.trim() || null,
      status: 'pendiente',
      costo_delivery:this.costoEnvioSeleccionado,
      paymentMethod: formValues.pago || 'efectivo',
      mesaId: this.mesaSeleccionada,
      products: this.carrito.map(p => ({
        id: p.id,
        cantidad: p.cantidad
      })),
      newCustomer: {
        customerName: `${formValues.nombre} ${formValues.apellido}`,
        customerEmail: formValues.email || null,
        customerAddress: formValues.direccion || null,
        customerPhone: formValues.telefono || null,
      },
      total
    };

    console.log('📦 Pedido enviado:', pedido);

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

    this.ordenService.createOrders(pedido).subscribe({
      next: (res) => {
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
        console.log('Orden creada:', res);
        this.imprimirFactura(
          formValues.nombre,
          formValues.apellido,
          formValues.direccion,
          formValues.telefono,
          formValues.email,
          formValues.pago,
          this.carrito
        );

        // reset
        this.carrito = [];
        this.detalle = '';
        this.deliveryForm.reset();
      },
      error: (err: any) => {
        this.enviandoPedido = false; // Desactivar estado de carga
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: '❌ Error al crear la orden',
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

  // Removed duplicate getSubtotal

  getCantidadTotal(): number {
    return this.carrito.reduce((acc, item) => acc + item.cantidad, 0);
  }

  getPropina(): number {
    return Math.round(this.getSubtotal() * 0.10);
  }

  getCostoEnvio(): number {
    return this.costoEnvioSeleccionado || 0;
  }

  getTotalConEnvio(): number {
    return this.getSubtotal() + this.getCostoEnvio();
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

  generarFactura(
    nombre: string,
    apellido: string,
    direccion: string,
    telefono: string,
    email: string,
    pago: string,
    carrito: any[]
  ) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 200], // ancho fijo, largo se ajusta
    });

    // ✅ Guardamos el total antes del onload
    const totalFactura = this.getSubtotal();

    try {
      const img = new Image();
      img.src = './logo.png';
      doc.addImage(img, 'PNG', 25, 5, 30, 15);
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }

    // Encabezado
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA / PEDIDO', 40, 25, { align: 'center' });

    // Datos cliente
    doc.setFontSize(9);
    let y = 35;
    doc.text(`Cliente: ${nombre} ${apellido}`, 10, y); y += 5;
    doc.text(`Dirección: ${direccion}`, 10, y); y += 5;
    doc.text(`Teléfono: ${telefono}`, 10, y); y += 5;
    doc.text(`Email: ${email}`, 10, y); y += 5;
    doc.text(`Método de pago: ${pago}`, 10, y); y += 5;
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, y);

    // 🟠 Tabla de productos
    const body = carrito.map((item) => [
      item.name,
      item.cantidad.toString(),
      `$${item.price}`,
      `$${item.price * item.cantidad}`,
    ]);

    autoTable(doc, {
      startY: y + 10,
      head: [['Producto', 'Cant.', 'P.Unit', 'Total']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, halign: 'center' },
      margin: { left: 5 }, // 👈 fuerza el inicio en X=10mm
      columnStyles: {
        0: { halign: 'left', cellWidth: 28 },
        1: { cellWidth: 10 },
        2: { cellWidth: 15 },
        3: { cellWidth: 17 },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 90; // fallback en caso de tabla vacía
    doc.setFontSize(14);
    doc.text(`Total: $${totalFactura}`, 14, finalY + 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su compra!', 40, finalY + 20, { align: 'center' });
    doc.save('factura.pdf');
  };

  resetFormulario() {
    this.deliveryForm.reset();
    this.carrito = [];
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  handleImageError(event: any) {
    // Usar Data URI SVG local en lugar de URL externa para evitar errores de red
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';
  }

  imprimirFactura(
    nombre: string,
    apellido: string,
    direccion: string,
    telefono: string,
    email: string,
    pago: string,
    carrito: any[]
  ) {
    const factura = {
      header: 'RESTAURANT BOULEVARD',
      nombre,
      apellido,
      direccion,
      telefono,
      email,
      pago,
      carrito,
      footer: '¡Gracias por preferirnos!',
    };

   
  }


  submit() {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    console.log('Datos enviados:', this.deliveryForm.value);
  }

  fieldInvalid(field: string) {
    return this.deliveryForm.get(field)?.invalid &&
      this.deliveryForm.get(field)?.touched;
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
    this.buscar();
  }

  /**
   * Resetea todos los filtros
   */
  resetearFiltros(): void {
    this.filtro = '';
    this.ordenActual = null;
    this.buscar();
  }

  /**
   * Aplica filtros y ordenamiento a los productos
   */
  productosOriginales: any[] = []; // Store original list

  /**
   * Applies filters and sorting to the products
   */
  private aplicarFiltrosYOrden(): void {
    // START filtering from the ORIGINAL list, not the current list
    let resultado = [...this.productosOriginales];

    // Filter by name
    if (this.filtro) {
      const filtroLower = this.filtro.toLowerCase();
      resultado = resultado.filter(p =>
        p.name?.toLowerCase().includes(filtroLower) ||
        p.description?.toLowerCase().includes(filtroLower)
      );
    }

    // Sort by price
    if (this.ordenActual === 'asc') {
      resultado.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.ordenActual === 'desc') {
      resultado.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    this.productosFiltrados = resultado;
    this.productos = resultado;
  }

  /**
   * Muestra mensaje cuando el servicio de delivery no está disponible
   */
  private mostrarMensajeDeliveryNoDisponible(): void {
    Swal.fire({
      icon: 'info',
      title: 'Delivery No Disponible',
      text: 'El servicio de delivery no está disponible en este momento. Por favor intenta más tarde.',
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
   * Muestra términos y condiciones de tratamiento de datos personales
   */
  mostrarTerminosCondiciones() {
    Swal.fire({
      title: 'Términos y Condiciones - Tratamiento de Datos Personales',
      html: `
        <div style="text-align: left; font-size: 14px; max-height: 400px; overflow-y: auto; color: #000000 !important;">
          <p style="color: #000000 !important;">Al proporcionar sus datos personales para el servicio de delivery, usted autoriza expresamente a <strong>ESPACIO BOULEVARD LINARES</strong> a:</p>
          <ul style="color: #000000 !important;">
            <li style="color: #000000 !important;">Recopilar y almacenar su nombre, apellido, dirección, teléfono y correo electrónico</li>
            <li style="color: #000000 !important;">Utilizar estos datos exclusivamente para la gestión y entrega de su pedido</li>
            <li style="color: #000000 !important;">Contactarlo únicamente para fines relacionados con su pedido</li>
            <li style="color: #000000 !important;">Mantener la confidencialidad y seguridad de sus datos personales</li>
          </ul>
          <p style="color: #000000 !important;"><strong>Derechos del Titular:</strong></p>
          <ul style="color: #000000 !important;">
            <li style="color: #000000 !important;">Derecho a acceder, rectificar y cancelar sus datos personales</li>
            <li style="color: #000000 !important;">Derecho a oponerse al tratamiento de sus datos</li>
            <li style="color: #000000 !important;">Derecho a revocar el consentimiento otorgado en cualquier momento</li>
          </ul>
          <p style="color: #000000 !important;">Para ejercer estos derechos, puede contactarnos a través de nuestros canales oficiales.</p>
          <p style="font-size: 12px; color: #000000 !important;">Conforme a la Ley de Protección de Datos Personales N° 19.628 y normativa vigente.</p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#28a745',
      showCancelButton: false,
      background: '#ffffff',
      color: '#000000'
    });
  }
}
