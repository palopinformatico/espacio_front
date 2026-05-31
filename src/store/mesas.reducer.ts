import { createReducer, on } from '@ngrx/store';
import * as MesasActions from './mesas.actions';
import { Mesa } from '../app/services/mesa.service';


export interface MesasState {
  mesas: Mesa[];
  loading: boolean;
  error: any;
}

export const initialState: MesasState = {
  mesas: [],
  loading: false,
  error: null
};

export const mesasReducer = createReducer(
  initialState,

  on(MesasActions.cargarMesas, state => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MesasActions.cargarMesasSuccess, (state, { mesas }) => ({
    ...state,
    mesas,
    loading: false
  })),

  on(MesasActions.cargarMesasFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(MesasActions.actualizarMesaEstadoSuccess, (state, { mesaId, estado }) => ({
    ...state,
    mesas: state.mesas.map(m =>
      m.id === mesaId ? { ...m, estado } : m
    )
  })),

  on(MesasActions.actualizarMesaEstadoFailure, (state, { error }) => ({
    ...state,
    error
  }))
);
