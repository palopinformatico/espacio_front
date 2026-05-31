import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Gasto, GastosService } from '../services/gastos.service';
import { CommonModule } from '@angular/common';
import { CategoriaGasto, CategoriaGastoService } from '../services/categoria-gasto.service';
import { GraficoGastosComponent } from "../grafico-gastos/grafico-gastos.component";
import { AuthService } from '../services/auth.service';
import { Proveedor, ProveedoresService } from '../services/proveedores.service';
import * as bootstrap from 'bootstrap';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gasto',
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css'],
  standalone: true,
  providers: [provideNgxMask()],
  imports: [CommonModule,NgxMaskDirective, FormsModule, ReactiveFormsModule, GraficoGastosComponent]
})
export class GastoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gastoService = inject(GastosService);
  private categoriaService = inject(CategoriaGastoService);
  private proveedorService = inject(ProveedoresService);
  private auth = inject(AuthService);
  gastosFiltrados: Gasto[] = [];
  categorias: any[] = [];
  proveedores: any[] = [];

  activeTab = 'historial';

  // Formulario específico para EDICIÓN
  editForm!: FormGroup;
  gastoSeleccionadoId: number | null = null; // Para saber cuál estamos editando
  modalEdicion: any; // Referencia al modal
  isAdmin = false;
  currentUser: any = null;

  gastoForm!: FormGroup;
  categoriaForm!: FormGroup;
  proveedorForm!: FormGroup;


  proveedoresFiltrados: Proveedor[] = [];
  gastos: Gasto[] = [];


  modoEdicionCategoria = false;
  categoriaEditandoId: number | null = null;

  modoEdicionProveedor = false;
  proveedorEditandoId: number | null = null;

  constructor() { }

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    this.isAdmin = this.currentUser?.role === 'admin';

    this.initForms();


    this.cargarCategorias();
    this.cargarProveedores();
    this.cargarGastos();
  }






  initForms() {
    // Formulario de Gasto
    this.gastoForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      categoriaId: [null, Validators.required],
      proveedorId: [null, Validators.required],
      concepto: ['', Validators.required], // Mapea a 'concepto' en la DB
      startDate: [this.getLocalDate(), Validators.required], // Fecha actual por defecto
      paymentMethod: ['efectivo', Validators.required],
      type: ['egreso'] // Valor por defecto oculto
    });
    this.editForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      concepto: ['', Validators.required],
      categoriaId: [null, Validators.required],
      proveedorId: [null, Validators.required],
      startDate: [null, Validators.required]
    });
    // Formulario de Categoría
    this.categoriaForm = this.fb.group({
      nombre: ['', Validators.required]
    });

    // Formulario de Proveedor con validaciones mejoradas
    this.proveedorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      razon_social: ['', Validators.minLength(3)],
      rut: ['', [Validators.pattern(/^[0-9]+-[0-9kK]{1}$/)]],
      telefono: ['', [Validators.pattern(/^(\+?56)?(\s?)(0?9)(\s?)[98765432]\d{7}$/)]],
      email: [''],  // Email completamente opcional, sin validaciones
      direccion: ['', Validators.minLength(5)],
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  cargarCategorias(): void {
    this.categoriaService.getCategorias().subscribe(data => this.categorias = data);
  }

  cargarProveedores(): void {
    this.proveedorService.findAll().subscribe(data => {
      this.proveedores = data;

    });
  }

  cargarGastos(): void {
    this.gastoService.getExpenses().subscribe(data => {
      this.gastos = data;
      this.gastosFiltrados = data;
    });
  }



  // ==========================================
  // GESTIÓN DE GASTOS
  // ==========================================
  crearGasto() {
    if (this.gastoForm.invalid) {
      this.gastoForm.markAllAsTouched(); // Muestra los errores rojos si faltan campos
      return;
    }

    // Preparamos los datos.
    // IMPORTANTE: Convertimos los IDs a números para evitar errores en el Backend
    const formValue = this.gastoForm.value;

    // Fix: Agregar T12:00:00 a la fecha para evitar cambios de día por zona horaria
    // Esto asegura que incluso con diferencias de +/-11h de zona horaria, se mantenga el mismo día
    let dateToSend = formValue.startDate;
    if (dateToSend && dateToSend.indexOf('T') === -1) {
      dateToSend = `${dateToSend}T12:00:00`;
    }

    const payload = {
      amount: Number(formValue.amount),
      concepto: formValue.concepto,
      startDate: dateToSend,
      paymentMethod: formValue.paymentMethod,
      type: formValue.type,
      // NestJS espera estos IDs para hacer las relaciones:
      proveedorId: Number(formValue.proveedorId),
      categoriaId: Number(formValue.categoriaId),
      // Si tu backend usa req.user, esto puede ser opcional, pero aquí lo enviamos

    };

    console.log('Enviando payload:', payload);

    this.gastoService.createExpense(payload).subscribe({
      next: (res) => {
        // Reseteamos el formulario manteniendo valores útiles por defecto
        this.gastoForm.reset({
          type: 'egreso',
          paymentMethod: 'efectivo',
          startDate: this.getLocalDate()
        });
        this.cargarGastos();
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'El gasto ha sido registrado correctamente.',
          confirmButtonColor: '#fd7e14',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar el gasto. Revisa los datos e intenta nuevamente.',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // ==========================================
  // GESTIÓN DE CATEGORÍAS
  // ==========================================
  guardarCategoria() {
    if (this.categoriaForm.invalid) return;

    // Solo enviamos el nombre, ignoramos description si existiese en el form por error
    const payload: CategoriaGasto = {
      nombre: this.categoriaForm.value.nombre
    };

    if (this.modoEdicionCategoria && this.categoriaEditandoId) {
      this.categoriaService.actualizarCategoria(this.categoriaEditandoId, payload).subscribe(() => {
        this.resetCategoriaForm();
        this.cargarCategorias();
      });
    } else {
      this.categoriaService.crearCategoria(payload).subscribe(() => {
        this.resetCategoriaForm();
        this.cargarCategorias();
      });
    }
  }

  editarCategoria(cat: CategoriaGasto) {
    this.modoEdicionCategoria = true;
    this.categoriaEditandoId = cat.id!;
    this.categoriaForm.patchValue({
      nombre: cat.nombre
    });
  }

  eliminarCategoria(id: number) {
    if (!confirm('¿Seguro deseas eliminar esta categoría?')) return;
    this.categoriaService.eliminarCategoria(id).subscribe(() => this.cargarCategorias());
  }

  resetCategoriaForm() {
    this.modoEdicionCategoria = false;
    this.categoriaEditandoId = null;
    this.categoriaForm.reset();
  }

  // ==========================================
  // GESTIÓN DE PROVEEDORES
  // ==========================================
  guardarProveedor() {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario Incompleto',
        text: 'Por favor, complete todos los campos requeridos correctamente.',
        confirmButtonColor: '#fd7e14'
      });
      return;
    }

    const payload: Proveedor = this.proveedorForm.value;

    if (this.modoEdicionProveedor && this.proveedorEditandoId) {
      // EDITAR PROVEEDOR
      this.proveedorService.update(this.proveedorEditandoId, payload).subscribe({
        next: () => {
          // Primero recargar los datos
          this.cargarProveedores();
          // Resetear el formulario
          this.resetProveedorForm();
          // Cerrar el modal
          this.cerrarModalProveedor();
          // Mostrar alerta después de un pequeño delay para asegurar que el modal se cierre
          setTimeout(() => {
            Swal.fire({
              icon: 'success',
              title: '¡Actualizado!',
              text: 'El proveedor ha sido actualizado correctamente.',
              confirmButtonColor: '#fd7e14',
              timer: 2000,
              showConfirmButton: false
            });
          }, 400);
        },
        error: (err) => {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el proveedor. Intente nuevamente.',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    } else {
      // CREAR PROVEEDOR
      this.proveedorService.create(payload).subscribe({
        next: () => {
          // Primero recargar los datos
          this.cargarProveedores();
          // Resetear el formulario
          this.resetProveedorForm();
          // Cerrar el modal
          this.cerrarModalProveedor();
          // Mostrar alerta después de un pequeño delay para asegurar que el modal se cierre
          setTimeout(() => {
            Swal.fire({
              icon: 'success',
              title: '¡Creado!',
              text: 'El proveedor ha sido creado correctamente.',
              confirmButtonColor: '#fd7e14',
              timer: 2000,
              showConfirmButton: false
            });
          }, 400);
        },
        error: (err) => {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear el proveedor. Intente nuevamente.',
            confirmButtonColor: '#dc3545'
          });
        }
      });
    }
  }

  // Método para cerrar el modal de proveedor
  private cerrarModalProveedor() {
    const modalElement = document.getElementById('proveedorModal');
    if (modalElement) {
      // Intentar obtener la instancia existente o crear una nueva
      let modal = bootstrap.Modal.getInstance(modalElement);
      if (!modal) {
        modal = new bootstrap.Modal(modalElement);
      }
      modal.hide();

      // Limpiar el backdrop y las clases de modal que puedan quedar
      setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
      }, 300);
    }
  }

  editarProveedor(prov: Proveedor) {
    this.modoEdicionProveedor = true;
    this.proveedorEditandoId = prov.id!;
    this.proveedorForm.patchValue(prov);
  }

  eliminarProveedor(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.proveedorService.remove(id).subscribe({
          next: () => {
            this.cargarProveedores();
            Swal.fire({
              icon: 'success',
              title: '¡Eliminado!',
              text: 'El proveedor ha sido eliminado correctamente.',
              confirmButtonColor: '#fd7e14',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el proveedor. Puede que esté asociado a gastos existentes.',
              confirmButtonColor: '#dc3545'
            });
          }
        });
      }
    });
  }

  resetProveedorForm() {
    this.modoEdicionProveedor = false;
    this.proveedorEditandoId = null;
    this.proveedorForm.reset();
  }

  // Utilitario
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  eliminarGasto(id: number) {
    // 1. Confirmación simple
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    // 2. Llamada al servicio
    this.gastoService.deleteExpense(id).subscribe({
      next: () => {
        // 3. Éxito: En vez de quitarlo, lo marcamos como anulado para que el usuario lo vea
        const gasto = this.gastosFiltrados.find(g => g.id === id);
        if (gasto) {
          gasto.deletedAt = new Date().toISOString();
          gasto.estado = 'anulado';
        }
        this.cargarGastos();
        alert('Gasto anulado correctamente');
      },
      error: (err) => {
        console.error(err);
        // Aquí caerá si es un Garzón intentando borrar algo ajeno (403 Forbidden)
        alert('Error: No tienes permiso para eliminar este gasto o ocurrió un problema.');
      }
    });
  }

  // ==========================================
  // LÓGICA DE EDITAR (Abrir Modal)
  // ==========================================
  abrirModalEditar(gasto: any) {
    this.gastoSeleccionadoId = gasto.id;

    // 1. Llenamos el formulario con los datos actuales del gasto
    this.editForm.patchValue({
      amount: gasto.amount,
      concepto: gasto.concepto,
      // Usamos el operador ?.id por si el objeto viene nulo
      categoriaId: gasto.categorias_gasto?.id,
      proveedorId: gasto.proveedor?.id,
      startDate: this.formatDateForInput(gasto.startDate || gasto.createdAt)
    });

    // 2. Abrimos el modal de Bootstrap usando JS nativo
    const modalElement = document.getElementById('editModal');
    if (modalElement) {
      this.modalEdicion = new bootstrap.Modal(modalElement);
      this.modalEdicion.show();
    }
  }

  // ==========================================
  // LÓGICA DE GUARDAR EDICIÓN
  // ==========================================
  guardarEdicion() {
    if (this.editForm.invalid || !this.gastoSeleccionadoId) return;

    // Fix: Appending T12:00:00 to prevent timezone shifts (setting it to noon)
    // This ensures that even with -/+ 11h timezone difference, it stays on the same day.
    let dateToSend = this.editForm.value.startDate;
    if (dateToSend && dateToSend.indexOf('T') === -1) {
      dateToSend = `${dateToSend}T12:00:00`;
    }

    const payload = {
      ...this.editForm.value,
      // Convertimos a número para asegurar compatibilidad con NestJS
      amount: Number(this.editForm.value.amount),
      categoriaId: Number(this.editForm.value.categoriaId),
      proveedorId: Number(this.editForm.value.proveedorId),
      startDate: dateToSend
    };

    this.gastoService.updateExpenses(this.gastoSeleccionadoId, payload).subscribe({
      next: (gastoActualizado) => {
        // 1. Cerramos el modal
        this.modalEdicion.hide();

        // 2. Actualizamos la lista visualmente (reemplazamos el viejo por el nuevo)
        const index = this.gastosFiltrados.findIndex(g => g.id === this.gastoSeleccionadoId);
        if (index !== -1) {
          // Importante: Asegurar que las relaciones (nombres) se mantengan visibles
          // A veces el update devuelve solo IDs, así que recargamos todo o hacemos un merge inteligente.
          // Para asegurar consistencia, recargamos la lista:
          this.cargarGastos();
        }

        alert('Gasto actualizado correctamente');
      },
      error: (err) => {
        console.error(err);
        alert('Error al actualizar. Verifica tus permisos.');
      }
    });
  }

  formatPrice(value: number): string {
    if (value == null) return '';
    // convierte el número a string con separador de miles
    return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatDateForInput(dateValue: string | Date): string {
    if (!dateValue) return '';
    try {
      // If it's a Date object, toISOString() gives UTC YYYY-MM-DDTHH:mm:ss...
      // If it's a string like "2023-01-01T00:00:00Z", it works directly
      // If it's "2023-01-01", split('T') works too.
      const dateStr = dateValue instanceof Date ? dateValue.toISOString() : dateValue.toString();
      return dateStr.split('T')[0];
    } catch (e) {
      console.error('Error parsing date:', dateValue, e);
      return '';
    }
  }

  private getLocalDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

}