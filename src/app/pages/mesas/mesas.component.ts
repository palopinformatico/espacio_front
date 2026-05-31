import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateMesaDto, Mesa, MesaService } from '../../services/mesa.service';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectMesas } from '../../../store/mesas.selectors';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

// Declara bootstrap para TypeScript
declare let bootstrap: any;

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.css']
})
export class MesasComponent implements OnInit {
  private mesaService = inject(MesaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private store = inject<Store<{
    mesas: Mesa[];
  }>>(Store);


  mesass$!: Observable<Mesa[]>;

  mesas: Mesa[] = [];
  nuevaMesa: CreateMesaDto = {
    numero_mesa: '',
    status: '',
  };

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.mesass$ = this.store.select(selectMesas);
  }


  ngOnInit(): void {
    this.cargarMesas();
    this.cdr.detectChanges();
  }

  cargarMesas(): void {
    this.mesaService.findAll().subscribe((data) => {
      this.mesas = data;
      this.cdr.detectChanges();
    });
  }

  agregarMesa(): void {
    if (!this.nuevaMesa.numero_mesa || !this.nuevaMesa.status) return;

    // Validar si ya existe una mesa con el mismo número
    const mesaExistente = this.mesas.find(m => m.numero_mesa === String(this.nuevaMesa.numero_mesa));
    if (mesaExistente) {
      alert(`Ya existe una mesa con el número ${this.nuevaMesa.numero_mesa}`);
      return;
    }

    const payload = {
      numero_mesa: String(this.nuevaMesa.numero_mesa),  // conversión explícita
      status: this.nuevaMesa.status
    };

    // Aquí haces la llamada al backend

    this.mesaService.create(payload).subscribe(() => {
      this.nuevaMesa = { numero_mesa: '', status: 'Libre' };
      this.cargarMesas();
      const modal = bootstrap.Modal.getInstance(document.getElementById('crearMesaModal'));
      if (modal) {
        modal.hide();
      }
    });
  }

  eliminarMesa(id: number): void {
    this.mesaService.delete(id).subscribe(() => this.cargarMesas());
  }

  confirmarEliminarMesa(mesa: Mesa) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de eliminar la Mesa ${mesa.numero_mesa}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarMesa(mesa.id);
        Swal.fire(
          '¡Eliminado!',
          'La mesa ha sido eliminada.',
          'success'
        );
      }
    });
  }

  abrirModal() {
    const modal = new bootstrap.Modal(document.getElementById('crearMesaModal'));
    modal.show();
  }

  crearMesa() {
    if (!this.nuevaMesa.numero_mesa || !this.nuevaMesa.status) return;

    // Validar si ya existe una mesa con el mismo número
    const mesaExistente = this.mesas.find(m => m.numero_mesa === String(this.nuevaMesa.numero_mesa));
    if (mesaExistente) {
      alert(`Ya existe una mesa con el número ${this.nuevaMesa.numero_mesa}`);
      return;
    }

    // Guardar en el array local o enviar al backend
    this.mesas.push({
      ...this.nuevaMesa,
      id: 0
    });

    // Resetear el formulario
    this.nuevaMesa = { numero_mesa: '', status: 'Libre' };

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('crearMesaModal'));
    modal.hide();
  }

  irDetalle(id: number) {
    this.router.navigate(['mesa', id]);
  }
}
