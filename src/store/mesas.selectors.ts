import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MesasState } from './mesas.reducer';

export const selectMesasState = createFeatureSelector<MesasState>('mesas');

export const selectMesas = createSelector(
  selectMesasState,
  (state) => state.mesas
);