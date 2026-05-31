export interface Horario {
  id: number;
  seccion: string;
  hora_inicio: string;
  hora_fin: string;
  enabled: boolean;
  trabaja_domingo: 'S' | 'N';
}
