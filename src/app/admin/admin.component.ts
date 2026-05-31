import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgbAlertModule, NgbDatepickerModule, NgbDateStruct, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HeaderComponent } from '../header/header.component';
import { environment } from '../../environments/environment';

import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, ProductService } from '../services/product.service';




// ES6 Modules or TypeScript
import Swal, { SweetAlertResult } from 'sweetalert2';
import { AdminHorariosComponent } from '../admin-horarios/admin-horarios.component';
import { AdminVentasComponent } from '../admin-ventas/admin-ventas.component';
import { GastoComponent } from '../gastos/gastos.component';
import { PendientesComponent } from '../pendientes/pendientes.component';
import { MesasComponent } from '../pages/mesas/mesas.component';
import { AuthService } from '../services/auth.service';
import { CategoriaService, Category, UpdateCategoryDto } from '../services/categoria.service';
import { UsuarioService } from '../services/usuario.service';
import { ThemeComponent } from '../theme/theme.component';
import { ContabilidadComponent } from "./contabilidad/contabilidad.component";
import { CostoEnvioService, CostoEnvio } from '../services/costo-envio.service';
import { MesaService, Mesa } from '../services/mesa.service';
import { IngresosComponent } from './ingresos/ingresos.component';
import { GarzonComponent } from '../garzon/garzon.component';






// 🌎 Configuración de Datepicker en Español Chile
import { Injectable } from '@angular/core';
import { NgbDatepickerI18n, NgbDateStruct as NgbDateStructI18n } from '@ng-bootstrap/ng-bootstrap';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

const I18N_VALUES: { [key: string]: { weekdays: string[]; months: string[]; weekLabel: string } } = {
  es: {
    weekdays: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    weekLabel: 'Sem'
  }
};

@Injectable()
export class SpanishDatepickerI18n extends NgbDatepickerI18n {
  override getWeekdayLabel(weekday: number): string {
    return I18N_VALUES['es'].weekdays[weekday - 1];
  }
  override getWeekLabel(): string {
    return I18N_VALUES['es'].weekLabel;
  }
  override getMonthShortName(month: number): string {
    return I18N_VALUES['es'].months[month - 1].substring(0, 3);
  }
  override getMonthFullName(month: number): string {
    return I18N_VALUES['es'].months[month - 1];
  }
  override getDayAriaLabel(date: NgbDateStructI18n): string {
    return `${date.day}-${date.month}-${date.year}`;
  }
}

@Component({
  selector: 'app-admin',
  standalone: true,
  providers: [
    DecimalPipe, provideNgxMask(),
    { provide: NgbDatepickerI18n, useClass: SpanishDatepickerI18n }
  ],
  imports: [NgxMaskDirective, HeaderComponent, PendientesComponent, ThemeComponent, AdminVentasComponent, CommonModule, NgbModule, FormsModule, ReactiveFormsModule, NgbDatepickerModule, NgbAlertModule, HttpClientModule, AdminHorariosComponent, ContabilidadComponent, GastoComponent, IngresosComponent, MesasComponent, GarzonComponent],

  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  @ViewChild('pendientesComponent') pendientesComponent!: PendientesComponent;
  @ViewChild('contabilidadComponent') contabilidadComponent!: ContabilidadComponent;

  activeTab = 'ajustes'; // Default to ajustes to show submenu
  activeSubTab = 'carta'; // Default subtab under Ajustes
  selectedCategoryIds: number[] = [];
  selectedCategoryId: number | 'all' = 'all';
  categorias: Category[] = [];
  categoriesFormArrays!: FormArray;
  categoryForm!: FormGroup;
  @ViewChild('closeCreateBtn') closeCreateBtn!: ElementRef;
  @ViewChild('closeEditBtn') closeEditBtn!: ElementRef;
  @ViewChild('closeCatCreateBtn') closeCatCreateBtn!: ElementRef;
  @ViewChild('closeCatEditBtn') closeCatEditBtn!: ElementRef;
  @ViewChild('closeUserBtn') closeUserBtn!: ElementRef;
  @ViewChild('closeShippingBtn') closeShippingBtn!: ElementRef;
  @ViewChild('closeTableBtn') closeTableBtn!: ElementRef;
  selectedCategory!: Category;
  selectedCategories: Category[] = [];
  selectedProductId!: number;
  model!: NgbDateStruct;

  // 📅 Fecha máxima para nacimiento (hoy - no se permiten fechas futuras)
  maxDate: NgbDateStruct = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  };
  // 📅 Fecha mínima (1900) para permitir seleccionar años anteriores sin límite práctico
  minDate: NgbDateStruct = { year: 1900, month: 1, day: 1 };
  editProductForm!: FormGroup;
  imagePreview: string | ArrayBuffer | null = null;
  productForm!: FormGroup;
  userForm!: FormGroup;
  selectedImage: File | undefined;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('userFileInput') userFileInputRef!: ElementRef<HTMLInputElement>;

  product: Product = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    categoryId: 0
  };
  isAdmin = false;
  limit = 1000;
  pages: number[] = [];
  categoria: { nombre: string; icono: string, eliminada: boolean } = { nombre: '', icono: '', eliminada: false };
  products: any[] = [];
  currentPage = 1;
  totalPages = 1;
  // Lista de iconos disponibles - Bootstrap Icons para Sistema POS Restaurante/Bar
  iconosDisponibles = [
    // 🍽️ COMIDAS Y PLATOS
    'cerveza.png',
    'bi-egg-fried',           // Desayuno / Huevos
    'bi-cup-hot',             // Café / Bebidas calientes
    'bi-cup-straw',           // Bebidas frías / Jugos
    'bi-cake',                // Tortas / Pasteles
    'bi-cake2',               // Postres
    // 🍺 BEBIDAS
    'bi-cup',                 // Tragos / Cócteles
    'bi-droplet',             // Licores
    'bi-droplet-fill',        // Shots
    'bi-droplet-half',        // Bebidas
    // 🛒 POS / VENTAS
    'bi-cart',                // Carrito
    'bi-cart-fill',           // Carrito lleno
    'bi-cart-plus',           // Agregar al carrito
    'bi-bag',                 // Bolsa / Para llevar
    'bi-bag-fill',            // Bolsa llena
    'bi-basket',              // Canasta / Combo
    'bi-basket-fill',         // Canasta llena
    'bi-receipt',             // Recibo / Ticket
    'bi-credit-card',         // Tarjeta crédito
    'bi-credit-card-2-front', // Tarjeta
    'bi-cash',                // Efectivo
    'bi-cash-stack',          // Dinero
    'bi-wallet2',             // Billetera
    'bi-currency-dollar',     // Precio / Dinero
    // 📦 PRODUCTOS
    'bi-box',                 // Producto
    'bi-box-seam',            // Paquete
    'bi-box2',                // Caja
    'bi-archive',             // Inventario
    'bi-grid',                // Grid productos
    'bi-grid-3x3-gap',        // Categorías
    'bi-list-ul',             // Lista
    'bi-list-check',          // Lista verificada
    // 🏪 LOCAL / TIENDA
    'bi-shop',                // Tienda
    'bi-shop-window',         // Vitrina
    'bi-building',            // Local
    'bi-house',               // Casa / Local
    'bi-door-open',           // Entrada
    // 🍕 COMIDA RÁPIDA
    'bi-fire',                // Picante / Hot
    'bi-snow',                // Frío / Helado
    'bi-thermometer-high',    // Caliente
    'bi-thermometer-snow',    // Frío
    // ⭐ CATEGORÍAS ESPECIALES
    'bi-star',                // Favoritos
    'bi-star-fill',           // Destacado
    'bi-heart',               // Me gusta
    'bi-heart-fill',          // Favorito
    'bi-award',               // Premio
    'bi-trophy',              // Trofeo
    'bi-bookmark-star',       // Destacado
    // 🚚 DELIVERY
    'bi-truck',               // Delivery
    'bi-bicycle',             // Delivery rápido
    'bi-scooter',             // Moto
    'bi-geo-alt',             // Ubicación
    'bi-geo-alt-fill',        // Dirección
    'bi-pin-map',             // Mapa
    // 👥 PERSONAS
    'bi-person',              // Cliente
    'bi-person-fill',         // Usuario
    'bi-people',              // Grupo
    'bi-people-fill',         // Clientes
    'bi-person-badge',        // Empleado
    // ⏰ TIEMPO
    'bi-clock',               // Hora
    'bi-clock-fill',          // Tiempo
    'bi-stopwatch',           // Timer
    'bi-calendar',            // Calendario
    'bi-calendar-check',      // Fecha confirmada
    // 🔧 HERRAMIENTAS POS
    'bi-calculator',          // Calculadora
    'bi-printer',             // Impresora
    'bi-upc-scan',            // Código barras
    'bi-qr-code',             // QR
    'bi-clipboard',           // Pedido
    'bi-clipboard-check',     // Orden lista
    // 📊 REPORTES
    'bi-graph-up',            // Ventas arriba
    'bi-graph-down',          // Ventas abajo
    'bi-bar-chart',           // Gráfico barras
    'bi-pie-chart',           // Gráfico circular
    // 💡 OTROS
    'bi-percent',             // Descuento
    'bi-tag',                 // Etiqueta precio
    'bi-tags',                // Etiquetas
    'bi-gift',                // Promoción
    'bi-bell',                // Notificación
    'bi-bell-fill',           // Alerta
    'bi-check-circle',        // Confirmado
    'bi-x-circle',            // Cancelado
    'bi-exclamation-triangle',// Advertencia
    'bi-info-circle',         // Información
    'bi-question-circle',     // Ayuda
    'bi-gear',                // Configuración
    'bi-sliders',             // Ajustes
    'bi-tools',               // Herramientas
    // 🏪 POS & VENTAS (EXTRA)
    'bi-calculator-fill',     // Calculadora llena
    'bi-cash-coin',           // Efectivo y monedas
    'bi-coin',                // Moneda
    'bi-credit-card-2-back',  // Tarjeta reverso
    'bi-credit-card-fill',    // Tarjeta llena
    'bi-wallet-fill',         // Billetera llena
    'bi-ticket-perforated',   // Ticket/Boucher
    'bi-receipt-cutoff',      // Recibo cortado
    'bi-inbox',               // Caja/Bandeja
    'bi-inbox-fill',          // Caja llena
    'bi-safe',                // Caja fuerte
    'bi-safe-fill',           // Caja fuerte llena
    'bi-shop-window',         // Vitrina
    'bi-basket2',             // Canasta 2
    'bi-basket2-fill',        // Canasta 2 llena
    'bi-bag-check',           // Bolsa check
    'bi-bag-check-fill',      // Bolsa check llena
    'bi-bag-plus',            // Bolsa más
    'bi-bag-plus-fill',       // Bolsa más llena
    'bi-bag-x',               // Bolsa x
    'bi-bag-x-fill',          // Bolsa x llena
    'bi-cart-check',          // Carrito check
    'bi-cart-check-fill',     // Carrito check lleno
    'bi-cart-x',              // Carrito x
    'bi-cart-x-fill',         // Carrito x lleno
    'bi-file-earmark-spreadsheet', // Planilla
    'bi-journal-check',       // Libro diario
    'bi-qr-code-scan',        // Escanear QR
    // 📂 ICONOS PERSONALIZADOS
    'Sushi.png',
    'bebi.png',
    'ensaladas.png',
    'icono_coctel.png',
    'icono_desayuno.png',
    'icono_pizza.png',
    'icono_platos.png',
    'icono_postres.png',
    'icono_sandwich.png',
    'mesa.png',
    'papas.png'
  ];

  usuario: any[] = []; // Changed to any[] since Usuario interface is removed, or should import from service if available

  usuarios = ['admin', 'garzon'];

  // Costo de Envío
  costosEnvio: CostoEnvio[] = [];
  costoEnvioForm!: FormGroup;
  selectedCostoEnvio: CostoEnvio | null = null;

  // Mesas
  mesas: Mesa[] = [];
  mesaForm!: FormGroup;
  selectedMesa: Mesa | null = null;

  constructor(private http: HttpClient, private categoriaService: CategoriaService, private productService: ProductService, private decimalPipe: DecimalPipe, private usuarioService: UsuarioService,
    private fb: FormBuilder, private authService: AuthService, private costoEnvioService: CostoEnvioService, private mesaService: MesaService

  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      // categoryId no se usa aquí porque usamos selectedCategoryIds
      image: [null]
    });
    this.userForm = this.fb.group({
      full_name: ['', Validators.required],
      username: ['', Validators.required],
      tipo: ['', Validators.required],
      contrasena: ['', Validators.required],
      fecha_nacimiento: [''], // No required
      profileImage: [null]
    });
    this.editProductForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      imageUrl: [''],
      categories: this.fb.array([])
    });
    this.costoEnvioForm = this.fb.group({
      precio_envio: [0, [Validators.required, Validators.min(0)]],
      descripcion: [''],
      porDefecto: [false]
    });
    this.mesaForm = this.fb.group({
      numero_mesa: ['', Validators.required],
      status: ['Libre', Validators.required]
    });
  }

  ngOnInit(): void {


    this.listarUsuario();
    this.isAdmin = this.authService.getUserRole() === 'admin';
    this.categoryForm = this.fb.group({
      nombre: ['', Validators.required],
      icono: ['', Validators.required]
    });
    this.listarCategoria();
    this.loadProducts();
    this.cargarCostosEnvio();
    this.cargarMesas();
  }

  setSelectedProduct(product: any) {
    this.selectedProductId = product.id;

    // Previsualizar imagen actual
    this.imagePreview = product.imageUrl || null;

    // Crear el formulario de edición con los datos del producto
    this.editProductForm = this.fb.group({
      name: [product.name],
      description: [product.description],
      price: [product.price],
      categories: this.fb.array([]) // se llena abajo
    });

    // 🧩 Crear los checkboxes según las categorías cargadas
    this.categoriesFormArrays = this.editProductForm.get('categories') as FormArray;
    this.categoriesFormArrays.clear();

    this.categorias.forEach(cat => {
      const isSelected = product.categories?.some((c: any) => c.id === cat.id);
      this.categoriesFormArrays.push(new FormControl(isSelected));
    });
  }



  /*categorías*/

  // Bootstrap Icon seleccionado (clase CSS)
  selectedIcon = 'bi-egg-fried'; // Icono por defecto

  // Método para manejar el cambio de selección


  get categoriesFormArray(): FormArray<FormControl<boolean>> {
    return this.editProductForm.get('categories') as FormArray<FormControl<boolean>>;
  }





  listarCategoria(): void {
    this.categoriaService.obtenerCategorias().subscribe({
      next: (response: Category[]) => {
        this.categorias = response.sort((a, b) => a.nombre.localeCompare(b.nombre));


        // 🔹 Crear un FormControl (checkbox) por cada categoría
        const categoryControls = this.categorias.map(() => this.fb.control(false));
        this.editProductForm.setControl('categories', this.fb.array(categoryControls));
      },
      error: (err) => {
        let errorMsg = 'Error desconocido';
        if (typeof err?.error === 'string') errorMsg = err.error;
        else if (err?.error?.message) errorMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        else if (err?.message) errorMsg = err.message;
        Swal.fire('Error', 'Error al obtener categorías: ' + errorMsg, 'error');
      }
    });
  }






  seleccionarIcono(icono: string) {
    this.categoria.icono = icono;
  }

  guardarCategoria() {
    // Validación manual para template-driven form
    if (!this.categoria.nombre) {
      Swal.fire('Atención', 'Debes completar el nombre de la categoría', 'warning');
      return;
    }

    // 🔹 Si no hay icono seleccionado, asignar uno por defecto
    if (!this.categoria.icono) {
      this.categoria.icono = 'bi-grid-3x3-gap';
    }

    this.http.post(environment.api.categories, this.categoria)
      .subscribe(response => {
        Swal.fire('Éxito', 'Categoría guardada correctamente', 'success');
        this.categoria.nombre = '';
        this.categoria.icono = '';
        this.listarCategoria();
        this.closeCatCreateBtn.nativeElement.click();
      }, error => {
        let errorMsg = 'Error desconocido';
        if (typeof error?.error === 'string') errorMsg = error.error;
        else if (error?.error?.message) errorMsg = Array.isArray(error.error.message) ? error.error.message.join(', ') : error.error.message;
        else if (error?.message) errorMsg = error.message;
        Swal.fire('Error', 'Error al guardar la categoría: ' + errorMsg, 'error');
      });
  }

  eliminarCategoria(id: number): void {
    this.categoriaService.eliminarCategoria(id).subscribe(
      () => {
        // Eliminar la categoría de la lista localmente
        this.categorias = this.categorias.filter(categoria => categoria.id !== id);
        this.listarCategoria();
      },
      (error: any) => {
        let errorMsg = 'Error desconocido';
        if (typeof error?.error === 'string') errorMsg = error.error;
        else if (error?.error?.message) errorMsg = Array.isArray(error.error.message) ? error.error.message.join(', ') : error.error.message;
        else if (error?.message) errorMsg = error.message;
        Swal.fire('Error', 'Error al eliminar la categoría: ' + errorMsg, 'error');
      }
    );
  }

  loadProducts(): void {
    const params: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.selectedCategoryId !== 'all') {
      params.categoryIds = [this.selectedCategoryId];
    }

    this.productService.buscarProductos(params).subscribe({
      next: (response: { data: any[]; currentPage: number; totalPages: number; }) => {
        this.products = response.data;
        this.currentPage = response.currentPage;
        this.totalPages = response.totalPages;

        // Generar los números de página
        this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
      },
      error: (err: any) => {
        let errorMsg = 'Error desconocido';
        if (typeof err?.error === 'string') errorMsg = err.error;
        else if (err?.error?.message) errorMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        else if (err?.message) errorMsg = err.message;
        Swal.fire('Error', 'Error al cargar productos: ' + errorMsg, 'error');
      }
    });
  }




  changePage(page: number) {
    if (page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  onFileSelecte(event: any) {
    const file = event.target.files[0];

    if (file) {
      // 1. Definimos el límite (2 MB = 2 * 1024 * 1024 bytes)
      const maxSize = 300000;

      // 2. Validamos el tamaño
      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'Imagen muy pesada',
          text: 'La imagen seleccionada supera los 300 KB. Por favor elige una más ligera.'
        });

        // IMPORTANTE: Limpiamos el input para que no se quede el archivo inválido seleccionado
        this.clearImage();
        return; // Detenemos la función aquí
      }

      // 3. Si pasa la validación, procedemos normalmente
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = e => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(file);

    } else {
      this.clearImage();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      // 1. Definimos el límite (2 MB = 2 * 1024 * 1024 bytes)
      const maxSize = 300000;

      // 2. Validamos el tamaño
      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'Imagen muy pesada',
          text: 'La imagen seleccionada supera los 300 KB. Por favor elige una más ligera.'
        });

        // IMPORTANTE: Limpiamos el input para que no se quede el archivo inválido seleccionado
        this.clearImage();
        return; // Detenemos la función aquí
      }

      // 3. Si pasa la validación, procedemos normalmente
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = e => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(file);

    } else {
      this.clearImage();
    }
  }

  clearImage() {
    // 1. Limpiar variable del archivo
    this.selectedImage = undefined;

    // 2. Limpiar la previsualización
    this.imagePreview = null;

    // 3. Limpiar el input del navegador (Vital para poder volver a subir el mismo archivo si se desea)
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
    if (this.userFileInputRef) {
      this.userFileInputRef.nativeElement.value = '';
    }
  }

  resetProductForm() {
    this.userForm.reset();
    this.clearImage();
    this.imagePreview = null;
    this.selectedImage = null!;
    this.userForm.get('imagen')?.reset();
    this.selectedCategoryIds = [];

    // Desmarcar checkboxes visualmente si es necesario, 
    // aunque al resetear selectedCategoryIds y cerrar el modal debería bastar.
  }

  async onSubmit() {
    // ✅ Marcar todos los campos como tocados para mostrar errores visuales
    this.productForm.markAllAsTouched();

    // 🔒 Validar nombre
    if (!this.productForm.value.name || this.productForm.value.name.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese el nombre del producto'
      });
      return;
    }

    // 🔒 Validar descripción
    if (!this.productForm.value.description || this.productForm.value.description.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese la descripción del producto'
      });
      return;
    }

    // 🔒 Validar precio - primero verificar que existe
    const priceRaw = String(this.productForm.value.price || '').replace(/[^0-9]/g, '');
    const priceInt = parseInt(priceRaw, 10);

    if (!this.productForm.value.price || priceRaw === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese el precio del producto'
      });
      return;
    }

    if (isNaN(priceInt)) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'Por favor ingrese un precio válido (solo números)'
      });
      return;
    }

    if (priceInt < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'El precio no puede ser negativo'
      });
      return;
    }

    // 🔒 Validar categorías
    if (this.selectedCategoryIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Categoría requerida',
        text: 'Por favor seleccione al menos una categoría'
      });
      return;
    }

    // ✅ Todas las validaciones pasaron, proceder a crear el producto

    const formData = new FormData();
    formData.append('name', this.productForm.value.name);
    formData.append('description', this.productForm.value.description);
    formData.append('price', priceInt.toString());


    // ✅ agregar todas las categorías seleccionadas
    this.selectedCategoryIds.forEach(id => formData.append('categoryIds', id.toString()));

    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    } else {
      // 🔹 Usar imagen por defecto si no se seleccionó ninguna
      try {
        const response = await fetch('/no-dis.webp');
        const blob = await response.blob();
        formData.append('image', new File([blob], 'no-dis.webp', { type: 'image/webp' }));
      } catch (error) {
        console.error('Error al cargar la imagen por defecto:', error);
      }
    }

    this.productService.createProduct(formData).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Producto creado con éxito', 'success');
        this.loadProducts();
        this.resetProductForm(); // Usar el método centralizado de limpieza
        this.clearImage();
        this.closeCreateBtn.nativeElement.click();
      },
      error: (err) => {
        let errorMsg = 'Error desconocido';
        if (typeof err?.error === 'string') errorMsg = err.error;
        else if (err?.error?.message) errorMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        else if (err?.message) errorMsg = err.message;
        Swal.fire('Error', 'Error al crear producto: ' + errorMsg, 'error');
      }
    });
  }

  onCategoryToggle(categoryId: number, event: any) {
    const checked = event.target.checked;
    if (checked) {
      // Agregar ID si no existe
      if (!this.selectedCategoryIds.includes(categoryId)) {
        this.selectedCategoryIds.push(categoryId);
      }
    } else {
      // Remover ID si existe
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    }
  }


  eliminarProducto(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás recuperar este producto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar'
    }).then((result: SweetAlertResult<any>) => {
      if (result.isConfirmed) {
        this.productService.eliminarProducto(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El producto ha sido eliminado.', 'success');
            this.products = this.products.filter(product => product.id !== id);
            this.loadProducts(); // recarga si quieres mantenerlo
          },
          error: (err: any) => {
            Swal.fire('Error', 'No se pudo eliminar el producto: ' + err, 'error');
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Cancelado', 'Tu producto está a salvo :)', 'info');
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadProducts(); // o como se llame tu función que carga los datos
  }

  generatePages() {
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

  }




  listarUsuario(): void {
    this.usuarioService.obtener().subscribe(
      (response: any[]) => { // Changed to any[]
        this.usuario = response; // Asignamos las categorías a la variable
        // Puedes verificar en la consola
      },
      (error: any) => {
        let errorMsg = 'Error desconocido';
        if (typeof error?.error === 'string') errorMsg = error.error;
        else if (error?.error?.message) errorMsg = Array.isArray(error.error.message) ? error.error.message.join(', ') : error.error.message;
        else if (error?.message) errorMsg = error.message;
        Swal.fire('Error', 'Error al obtener usuarios: ' + errorMsg, 'error');
      }
    );
  }

  /**
   * Helper para validar si hay categorías seleccionadas en el formulario de edición.
   */
  isCategoriesInvalid(): boolean {
    const selected = this.categoriesFormArrays.value.some((checked: boolean) => checked);
    return !selected;
  }

  onEditSubmit() {
    // ✅ Marcar todos los campos como tocados para mostrar errores visuales
    this.editProductForm.markAllAsTouched();

    // 🔒 Validar nombre
    if (!this.editProductForm.value.name || this.editProductForm.value.name.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese el nombre del producto'
      });
      return;
    }

    // 🔒 Validar descripción
    if (!this.editProductForm.value.description || this.editProductForm.value.description.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese la descripción del producto'
      });
      return;
    }

    // 🔒 Validar precio - primero verificar que existe
    const priceValue = String(this.editProductForm.value.price || '').replace(/[^0-9]/g, '');
    const finalPrice = parseInt(priceValue, 10);

    if (!this.editProductForm.value.price || priceValue === '') {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Por favor ingrese el precio del producto'
      });
      return;
    }

    if (isNaN(finalPrice)) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'Por favor ingrese un precio válido (solo números)'
      });
      return;
    }

    if (finalPrice < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'El precio no puede ser negativo'
      });
      return;
    }



    // � Validar categorías
    const selectedCategoryIds = this.categoriesFormArrays.value
      .map((checked: boolean, i: number) => (checked ? this.categorias[i].id : null))
      .filter((id: number | null): id is number => id !== null);

    if (selectedCategoryIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Categoría requerida',
        text: 'Por favor seleccione al menos una categoría'
      });
      return;
    }

    const productData = {
      name: this.editProductForm.value.name,
      description: this.editProductForm.value.description,
      price: finalPrice,
      categories: selectedCategoryIds
    };

    console.log('📦 Datos a enviar:', productData);
    console.log('🖼️ Imagen seleccionada:', this.selectedImage);

    // 🔹 Llamar al servicio
    this.productService.updateProduct(this.selectedProductId, productData, this.selectedImage)
      .subscribe({
        next: (res) => {
          Swal.fire('Éxito', 'Producto actualizado correctamente', 'success');
          this.loadProducts();
          this.imagePreview = null;
          this.selectedImage = null!;
          this.closeEditBtn.nativeElement.click();
        },
        error: (err) => {
          console.error('❌ Error completo:', err);
          console.error('❌ Error status:', err?.status);
          console.error('❌ Error body:', err?.error);

          // Extraer mensaje de error de varias posibles estructuras
          let errorMsg = 'Error desconocido';
          if (typeof err?.error === 'string') {
            errorMsg = err.error;
          } else if (err?.error?.message) {
            errorMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
          } else if (err?.message) {
            errorMsg = err.message;
          } else if (err?.statusText) {
            errorMsg = `${err.status}: ${err.statusText}`;
          }

          Swal.fire('Error', 'Error al actualizar producto: ' + errorMsg, 'error');
          // Cerrar popup igualmente para evitar bloqueo
          this.loadProducts();
          this.closeEditBtn.nativeElement.click();
        }
      });
  }











  selectedUserId: number | null = null;
  isEditingUser = false;

  crearUsuario() {


    this.usuarioService.crearUsuario(
      this.userForm.value.full_name,
      this.userForm.value.username,
      this.userForm.value.contrasena,
      this.selectedImage!,
      this.userForm.value.tipo,
      this.userForm.value.fecha_nacimiento
    ).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Usuario creado con éxito', 'success');
        this.listarUsuario();
        this.userForm.reset();
        this.clearImage();
        this.imagePreview = null;
        this.selectedImage = null!;
        this.closeUserBtn.nativeElement.click(); // Cerrar modal
      },
      error: (err: any) => {
        let errorMsg = err?.error?.message || err?.message || err;
        Swal.fire('Error', 'Error al crear usuario: ' + errorMsg, 'error');
      }
    });
  }

  setSelectedUser(user: any) {
    this.selectedUserId = user.id;
    this.isEditingUser = true;
    // 🔹 Usar getProfileImageUrl para construir la URL completa o usar imagen por defecto
    this.imagePreview = this.getProfileImageUrl(user.profileImage);

    this.userForm.patchValue({
      full_name: user.full_name,
      username: user.username,
      role: user.tipo_usuario,
      // contrasena: user.password, // No mostrar contraseña por seguridad
      // fecha_nacimiento: user.fecha_nacimiento // Si existe
    });

    // Quitar validador de contraseña si es edición (opcional)
    this.userForm.get('contrasena')?.clearValidators();
    this.userForm.get('contrasena')?.updateValueAndValidity();
  }

  resetUserForm() {

    this.userForm.reset();
    this.selectedUserId = null;
    this.isEditingUser = false;
    this.userForm.get('imagen')?.reset();
    // 🔹 Mostrar imagen por defecto al crear nuevo usuario
    this.imagePreview = 'icono.jpeg';
    this.selectedImage = null!;
    this.closeCreateBtn.nativeElement.click();
    // Restaurar validadores

    this.userForm.get('contrasena')?.setValidators(Validators.required);
    this.userForm.get('contrasena')?.updateValueAndValidity();
  }

  guardarUsuario() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      Swal.fire('Atención', 'Por favor complete todos los campos del usuario', 'warning');
      return;
    }

    if (this.isEditingUser && this.selectedUserId) {
      this.actualizarUsuario();
      this.clearImage();
    } else {
      this.crearUsuario();
      this.clearImage();
    }
  }

  actualizarUsuario() {
    if (!this.selectedUserId) return;

    const data = {
      full_name: this.userForm.value.full_name,
      username: this.userForm.value.username,
      tipo_usuario: this.userForm.value.tipo,
      password: this.userForm.value.contrasena, // Solo si se ingresó algo
      fecha_nacimiento: this.userForm.value.fecha_nacimiento
    };

    this.usuarioService.actualizarUsuario(this.selectedUserId, data, this.selectedImage).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Usuario actualizado con éxito', 'success');
        this.listarUsuario();
        this.listarUsuario();
        this.resetUserForm();
        this.closeUserBtn.nativeElement.click(); // Cerrar modal
      },
      error: (err: any) => {
        let errorMsg = err?.error?.message || err?.message || err;
        Swal.fire('Error', 'Error al actualizar usuario: ' + errorMsg, 'error');
      }
    });
  }

  eliminarUsuario(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás recuperar este usuario!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuarioService.eliminarUsuario(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El usuario ha sido eliminado.', 'success');
            this.listarUsuario();
          },
          error: (err: any) => Swal.fire('Error', 'No se pudo eliminar el usuario: ' + err, 'error')
        });
      }
    });
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    // convierte el número a string con separador de miles
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }



  setSelectedCategory(cat: Category) {
    this.selectedCategory = cat; // 👈 Fixed: Update the selected object reference
    this.selectedCategoryId = cat.id;
    this.categoryForm.patchValue({
      nombre: cat.nombre,
      icono: cat.icono
    });
  }

  saveCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      Swal.fire('Atención', 'Debes completar el nombre y seleccionar un icono', 'warning');
      return;
    }

    if (this.selectedCategory) {
      console.log(this.selectedCategory);
      const updateData: UpdateCategoryDto = this.categoryForm.value;
      this.categoriaService.updateCategory(this.selectedCategory.id!, updateData)
        .subscribe({
          next: updated => {
            const index = this.categorias.findIndex(c => c.id === updated.id);
            if (index !== -1) this.categorias[index] = updated;
            this.listarCategoria();
            this.closeCatEditBtn.nativeElement.click();
          },
          error: err => {
            let errorMsg = 'Error desconocido';
            if (typeof err?.error === 'string') errorMsg = err.error;
            else if (err?.error?.message) errorMsg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
            else if (err?.message) errorMsg = err.message;
            Swal.fire('Error', 'Error al actualizar categoría: ' + errorMsg, 'error');
          }
        });
    } else {
      Swal.fire('Atención', 'No hay categoría seleccionada para editar', 'warning');
    }
  }

  confirmDelete(cat: Category) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Seguro que deseas eliminar la categoría "${cat.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoriaService.deleteCategory(cat.id).subscribe({
          next: () => {
            this.categorias = this.categorias.filter(c => c.id !== cat.id);
            Swal.fire('Eliminado', 'Categoría eliminada', 'success');
          },
          error: (err: any) => {
            let errorMsg = err?.error?.message || err?.message || err;
            Swal.fire('Error', 'Error al eliminar categoría: ' + errorMsg, 'error');
          }
        });
      }
    });
  }





  getCategoryName(id: number): string {
    const category = this.categorias.find(c => c.id === id);
    return category ? category.nombre : 'Desconocida';
  }

  /**
   * Verifica si el icono es un Bootstrap Icon (empieza con 'bi-')
   */
  isBootstrapIcon(icono: string): boolean {
    return !!icono && icono.startsWith('bi-');
  }

  /**
   * Obtiene la clase CSS completa para mostrar el icono
   * - Si es Bootstrap Icon: retorna 'bi bi-xxx'
   * - Si es imagen antigua: retorna null (para usar <img> en su lugar)
   */
  getIconClass(icono: string): string | null {
    if (!icono) return null;
    if (icono.startsWith('bi-')) {
      return 'bi ' + icono;
    }
    return null; // Es una imagen, no un icono Bootstrap
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;

    // Espera un ciclo de Angular para que la pestaña se active
    setTimeout(() => {
      if (tab === 'pendientes' && this.pendientesComponent) {
        this.pendientesComponent.loadPendientes();
      }
      if (tab === 'contabilidad' && this.contabilidadComponent) {
        // Los datos se cargan automáticamente en ngOnInit
      }
    }, 0);
  }

  setActiveSubTab(subTab: string) {
    this.activeSubTab = subTab;
  }



getProfileImageUrl(profileImage: string): string {
    // 1. Si no hay imagen, devolvemos la que está en los assets locales (Angular)
    if (!profileImage) {
        return '/assets/icono.jpeg'; 
    }

    // 2. Si ya viene con http/https, es una URL externa o completa
    if (profileImage.startsWith('http')) {
        return profileImage; 
    }

    // 3. Manejo de rutas del backend
    // Definir la URL base de tu backend (Idealmente esto debería venir de environment.ts)
    const baseUrl = environment.apiBase.replace('/api/v1', '');

    if (profileImage.startsWith('/uploads/')) {
      // Ya tiene la ruta relativa completa del backend
      return `${baseUrl}${profileImage}`;
    }

    // 4. Solo es el nombre del archivo, construimos la ruta específica
    return `${baseUrl}/uploads/profile-images/${profileImage}`;
}
  // ==========================================
  // 🔹 CRUD COSTO DE ENVÍO
  // ==========================================

  cargarCostosEnvio(): void {
    this.costoEnvioService.obtenerCostosEnvio().subscribe({
      next: (data) => {
        this.costosEnvio = data;
      },
      error: (err) => {
        console.error('Error al cargar costos de envío:', err);
        Swal.fire('Error', 'No se pudieron cargar los costos de envío', 'error');
      }
    });
  }

  abrirModalCostoEnvio(costo?: CostoEnvio): void {
    if (costo) {
      this.selectedCostoEnvio = costo;
      this.costoEnvioForm.patchValue({
        precio_envio: costo.precio_envio,
        descripcion: costo.descripcion || '',
        porDefecto: costo.porDefecto || false
      });
    } else {
      this.selectedCostoEnvio = null;
      this.costoEnvioForm.reset({
        precio_envio: 0,
        descripcion: '',
        porDefecto: false
      });
    }
  }

  guardarCostoEnvio(): void {
    if (this.costoEnvioForm.invalid) {
      this.costoEnvioForm.markAllAsTouched();
      return;
    }

    const price = this.costoEnvioForm.value.precio_envio;
    if (price < 0) {
      Swal.fire('Error', 'El precio de envío no puede ser negativo', 'error');
      return;
    }

    const data = {
      precio_envio: this.costoEnvioForm.value.precio_envio,
      descripcion: this.costoEnvioForm.value.descripcion || '',
      porDefecto: this.costoEnvioForm.value.porDefecto || false
    };

    if (this.selectedCostoEnvio) {
      // Actualizar
      this.costoEnvioService.actualizarCostoEnvio(this.selectedCostoEnvio.id, data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Costo de envío actualizado correctamente', 'success');
          this.cargarCostosEnvio();
          this.costoEnvioForm.reset();
          this.closeShippingBtn.nativeElement.click();
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire('Error', 'No se pudo actualizar el costo de envío', 'error');
        }
      });
    } else {
      // Crear
      this.costoEnvioService.crearCostoEnvio(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Costo de envío creado correctamente', 'success');
          this.cargarCostosEnvio();
          this.costoEnvioForm.reset();
          this.closeShippingBtn.nativeElement.click();
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire('Error', 'No se pudo crear el costo de envío', 'error');
        }
      });
    }
  }

  eliminarCostoEnvio(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás recuperar este costo de envío!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.costoEnvioService.eliminarCostoEnvio(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El costo de envío ha sido eliminado.', 'success');
            this.cargarCostosEnvio();
          },
          error: (err) => {
            console.error('Error:', err);
            Swal.fire('Error', 'No se pudo eliminar el costo de envío', 'error');
          }
        });
      }
    });
  }

  // ==========================================
  // 🏠 CRUD MESAS
  // ==========================================

  cargarMesas(): void {
    this.mesaService.findAll().subscribe({
      next: (data) => {
        this.mesas = data;
        console.log('✅ Mesas cargadas:', this.mesas.length);
      },
      error: (err) => {
        console.error('Error al cargar mesas:', err);
        Swal.fire('Error', 'No se pudieron cargar las mesas', 'error');
      }
    });
  }

  abrirModalMesa(mesa?: Mesa): void {
    if (mesa) {
      this.selectedMesa = mesa;
      this.mesaForm.patchValue({
        numero_mesa: mesa.numero_mesa,
        status: mesa.status
      });
    } else {
      this.selectedMesa = null;
      this.mesaForm.reset({
        numero_mesa: '',
        status: 'Libre'
      });
    }
  }

  guardarMesa(): void {
    if (this.mesaForm.invalid) {
      this.mesaForm.markAllAsTouched();
      return;
    }

    const data = {
      numero_mesa: this.mesaForm.value.numero_mesa,
      status: this.mesaForm.value.status
    };

    if (this.selectedMesa) {
      // Actualizar
      this.mesaService.update(this.selectedMesa.id, data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Mesa actualizada correctamente', 'success');
          this.cargarMesas();
          this.mesaForm.reset();
          this.closeTableBtn.nativeElement.click();
        },
        error: (err: any) => {
          console.error('Error:', err);
          Swal.fire('Error', 'No se pudo actualizar la mesa', 'error');
        }
      });
    } else {
      // Crear
      this.mesaService.create(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Mesa creada correctamente', 'success');
          this.cargarMesas();
          this.mesaForm.reset({
            numero_mesa: '',
            status: 'Libre'
          });
          this.closeTableBtn.nativeElement.click();
        },
        error: (err: any) => {
          console.error('Error:', err);
          Swal.fire('Error', 'No se pudo crear la mesa', 'error');
        }
      });
    }
  }

  eliminarMesa(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás recuperar esta mesa!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No, cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mesaService.delete(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'La mesa ha sido eliminada.', 'success');
            this.cargarMesas();
          },
          error: (err: any) => {
            console.error('Error:', err);
            Swal.fire('Error', 'No se pudo eliminar la mesa', 'error');
          }
        });
      }
    });
  }


}

