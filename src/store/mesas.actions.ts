import { createAction, props } from '@ngrx/store';
import { Mesa } from '../app/services/mesa.service';


// Cargar mesas desde el backend
export const cargarMesas = createAction('[Mesas] Cargar Mesas');
export const cargarMesasSuccess = createAction(
  '[Mesas] Cargar Mesas Success',
  props<{ mesas: Mesa[] }>()
);
export const cargarMesasFailure = createAction(
  '[Mesas] Cargar Mesas Failure',
  props<{ error: any }>()
);

// Actualizar estado de una mesa
export const actualizarMesaEstado = createAction(
  '[Mesas] Actualizar Estado Mesa',
  props<{ mesaId: number; estado: string }>()
);

export const actualizarMesaEstadoSuccess = createAction(
  '[Mesas] Actualizar Estado Mesa Success',
  props<{ mesaId: number; estado: string }>()
);

export const actualizarMesaEstadoFailure = createAction(
  '[Mesas] Actualizar Estado Mesa Failure',
  props<{ error: any }>()
);
