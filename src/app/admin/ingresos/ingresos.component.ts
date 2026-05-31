import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgbModule, NgbDateStruct, NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { IngresoService } from '../../services/ingreso.service';
import { CategoriaIngresoService } from '../../services/categoria-ingreso.service';
import { ClienteIngresoService } from '../../services/cliente-ingreso.service';
import { Ingreso, CategoriaIngreso, ClienteIngreso } from '../../services/models/ingreso.model';
import { AuthService } from '../../services/auth.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';


@Component({
    selector: 'app-ingresos',
    standalone: true,
    providers: [provideNgxMask()],
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, NgxMaskDirective],
    templateUrl: './ingresos.component.html',
    styleUrls: ['./ingresos.component.css']
})
export class IngresosComponent implements OnInit {
    ingresos: Ingreso[] = [];
    categorias: CategoriaIngreso[] = [];
    clientes: ClienteIngreso[] = [];
    currentUser: any = null;
    isAdmin = false;


    ingresoForm!: FormGroup;
    clienteForm!: FormGroup;
    categoriaForm!: FormGroup; // Form for categories CRUD

    isEditing = false;
    isEditingCliente = false;
    isEditingCategoria = false;

    selectedIngresoId: number | null = null;
    selectedClienteId: number | null = null;
    selectedCategoriaId: number | null = null;

    activeTab: 'ingresos' | 'clientes' | 'categorias' = 'ingresos';
    @ViewChild('closeClienteModalBtn') closeClienteModalBtn!: ElementRef;
    @ViewChild('closeCategoriaModalBtn') closeCategoriaModalBtn!: ElementRef;



    @ViewChild('closeModalBtn') closeModalBtn!: ElementRef;

    // Datepicker model
    fechaModel!: NgbDateStruct;

    constructor(
        private ingresoService: IngresoService,
        private categoriaService: CategoriaIngresoService,
        private clienteService: ClienteIngresoService,
        private fb: FormBuilder,
        private auth: AuthService
    ) {

        this.ingresoForm = this.fb.group({
            concepto: ['', Validators.required],
            fecha: ['', Validators.required], // Will handle conversion
            metodo_pago: ['', Validators.required],
            monto: ['', [Validators.required, Validators.pattern("^[0-9]*$")]],
            categoriaIds: [[], Validators.required], // Multi-select
            clienteIds: [[], Validators.required]   // Multi-select
        });

        this.clienteForm = this.fb.group({
            nombre: ['', Validators.required],
            rut: ['', Validators.required],
            telefono: ['', [Validators.pattern("^[0-9]*$")]],
            email: ['', [Validators.email]]
        });

        this.categoriaForm = this.fb.group({
            nombre_cat: ['', Validators.required]
        });
    }

    setActiveTab(tab: 'ingresos' | 'clientes' | 'categorias') {
        this.activeTab = tab;
    }





    ngOnInit(): void {
        this.currentUser = this.auth.getUser();
        this.isAdmin = this.currentUser?.role === 'admin';

        console.log('🚀 IngresosComponent: ngOnInit');
        console.log('👤 Usuario:', this.currentUser);
        console.log('🔑 Es admin:', this.isAdmin);

        this.loadData();
    }

    loadData() {
        console.log('🔄 IngresosComponent: Cargando datos...');
        console.log('👤 Usuario actual:', this.currentUser);

        this.ingresoService.obtenerIngresos().subscribe({
            next: (data) => {
                console.log('✅ IngresosComponent: Datos de ingresos recibidos:', data);
                console.log('📊 Cantidad de ingresos:', data.length);
                this.ingresos = data;
            },
            error: (err) => {
                console.error('❌ IngresosComponent: Error al cargar ingresos:', err);
            }
        });

        this.categoriaService.obtenerCategorias().subscribe(data => {
            console.log('✅ Categorías cargadas:', data);
            this.categorias = data;
        });
        this.clienteService.obtenerClientes().subscribe(data => {
            console.log('✅ Clientes cargados:', data);
            this.clientes = data;
        });
    }


    openModal() {
        this.isEditing = false;
        this.selectedIngresoId = null;
        this.ingresoForm.reset({
            categoriaIds: [],
            clienteIds: []
        });


        // Set default date to today
        const today = new Date();
        this.fechaModel = {
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate()
        };
    }

    editIngreso(ingreso: Ingreso) {
        this.isEditing = true;
        this.selectedIngresoId = ingreso.id;

        // Parse date
        const date = new Date(ingreso.fecha);
        this.fechaModel = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };

        this.ingresoForm.patchValue({
            concepto: ingreso.concepto,
            metodo_pago: ingreso.metodo_pago,
            monto: ingreso.monto,
            categoriaIds: ingreso.categoria ? [ingreso.categoria.id] : [],
            clienteIds: ingreso.cliente ? [ingreso.cliente.id] : []
        });


    }

    onSubmit() {


        const formValue = this.ingresoForm.value;

        // Format date for backend YYYY-MM-DD
        const month = this.fechaModel.month.toString().padStart(2, '0');
        const day = this.fechaModel.day.toString().padStart(2, '0');
        const fechaDate = `${this.fechaModel.year}-${month}-${day}`;

        const ingresoData: any = {
            concepto: formValue.concepto,
            fecha: fechaDate, // or .toISOString() depending on backend
            metodo_pago: formValue.metodo_pago,
            monto: formValue.monto,
            categoriasIds: formValue.categoriaIds,
            clientesIds: formValue.clienteIds
        };


        if (this.isEditing && this.selectedIngresoId) {
            this.ingresoService.actualizarIngreso(this.selectedIngresoId, ingresoData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Ingreso actualizado correctamente', 'success');
                    this.loadData();
                    this.closeModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo actualizar el ingreso', 'error')
            });
        } else {
            this.ingresoService.crearIngreso(ingresoData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Ingreso creado correctamente', 'success');
                    this.loadData();
                    this.closeModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo crear el ingreso', 'error')
            });
        }
    }

    deleteIngreso(id: number) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.ingresoService.eliminarIngreso(id).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'El ingreso ha sido eliminado.', 'success');
                        this.loadData();
                    },
                    error: () => Swal.fire('Error', 'No se pudo eliminar el ingreso', 'error')
                });
            }
        });
    }

    // ==========================================
    // 🔹 CLIENTE CRUD
    // ==========================================

    openClienteModal() {
        this.isEditingCliente = false;
        this.selectedClienteId = null;
        this.clienteForm.reset();
    }

    editCliente(cliente: ClienteIngreso) {
        this.isEditingCliente = true;
        this.selectedClienteId = cliente.id;
        this.clienteForm.patchValue({
            nombre: cliente.nombre,
            rut: cliente.rut,
            telefono: cliente.telefono,
            email: cliente.email
        });
    }

    onSubmitCliente() {
        if (this.clienteForm.invalid) {
            this.clienteForm.markAllAsTouched();
            return;
        }

        const clienteData = this.clienteForm.value;

        if (this.isEditingCliente && this.selectedClienteId) {
            this.clienteService.actualizarCliente(this.selectedClienteId, clienteData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Cliente actualizado correctamente', 'success');
                    this.loadData();
                    this.closeClienteModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo actualizar el cliente', 'error')
            });
        } else {
            this.clienteService.crearCliente(clienteData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Cliente creado correctamente', 'success');
                    this.loadData();
                    this.closeClienteModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo crear el cliente', 'error')
            });
        }
    }

    deleteCliente(id: number) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Eliminar este cliente?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.clienteService.eliminarCliente(id).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'Cliente eliminado.', 'success');
                        this.loadData();
                    },
                    error: () => Swal.fire('Error', 'No se pudo eliminar el cliente', 'error')
                });
            }
        });
    }

    // ==========================================
    // 🔹 CATEGORIA CRUD
    // ==========================================

    openCategoriaModal() {
        this.isEditingCategoria = false;
        this.selectedCategoriaId = null;
        this.categoriaForm.reset();
    }

    editCategoria(cat: CategoriaIngreso) {
        this.isEditingCategoria = true;
        this.selectedCategoriaId = cat.id;
        this.categoriaForm.patchValue({
            nombre_cat: cat.nombre_cat
        });
    }

    onSubmitCategoria() {
        if (this.categoriaForm.invalid) {
            this.categoriaForm.markAllAsTouched();
            return;
        }

        const catData = this.categoriaForm.value;

        if (this.isEditingCategoria && this.selectedCategoriaId) {
            this.categoriaService.actualizarCategoria(this.selectedCategoriaId, catData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Categoría actualizada correctamente', 'success');
                    this.loadData();
                    this.closeCategoriaModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo actualizar la categoría', 'error')
            });
        } else {
            this.categoriaService.crearCategoria(catData).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Categoría creada correctamente', 'success');
                    this.loadData();
                    this.closeCategoriaModalBtn.nativeElement.click();
                },
                error: (err) => Swal.fire('Error', 'No se pudo crear la categoría', 'error')
            });
        }
    }

    deleteCategoria(id: number) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Eliminar esta categoría?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.categoriaService.eliminarCategoria(id).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'Categoría eliminada.', 'success');
                        this.loadData();
                    },
                    error: () => Swal.fire('Error', 'No se pudo eliminar la categoría', 'error')
                });
            }
        });
    }

}




