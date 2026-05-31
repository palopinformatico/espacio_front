import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Expense {
  id?: number;
  amount: number;
  description?: string;
  createdAt?: string;
}

export interface BalanceDiario {
  fecha: string;
  ingresos: number;
  egresos: number;
}

export interface ProductoVendido {
  producto: string;
  cantidad: number;
  total: number;
  propina: number;
}

export interface BalanceDiarios {
  fecha: string;
  totalIngresos: number;
  totalEgresos: number;
  productosVendidos: ProductoVendido[];
}

// 1. Interfaces auxiliares (para las relaciones)
export interface CategoriaGasto {
  id: number;
  nombre: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  rut?: string; // Si lo usas
}

export interface User {
  id: number;
  username?: string;
  full_name?: string;
  role?: string;
}

// 2. Interfaz Principal (Lo que recibes del Backend - GET)
export interface Gasto {
  id: number;
  amount: number;
  description?: string; // El '?' significa que puede ser null o undefined
  concepto?: string;

  // Usamos Union Types para restringir los valores exactos como en el Backend
  type: 'ingreso' | 'egreso';
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque';
  frequency: 'ninguno' | 'diario' | 'semanal' | 'mensual';

  estado?: string;
  deletedAt?: string | Date;

  // Las fechas suelen llegar como string desde la API JSON
  startDate?: string | Date;
  endDate?: string | Date;
  createdAt: string | Date;

  dayOfWeek?: number;
  dayOfMonth?: number;

  // RELACIONES: Aquí vienen objetos completos cuando usas 'relations' en TypeORM
  // Nota: Debe coincidir exactamente con el nombre de la propiedad en tu Entity de NestJS
  categorias_gasto?: CategoriaGasto;
  proveedor?: Proveedor;
  users?: User[];
  customer?: any; // Puedes definir una interfaz Customer si la necesitas
}

// 3. Interfaz para Crear (Lo que envías en el Formulario - POST)
export interface CreateGastoPayload {
  amount: number;
  concepto: string;
  description?: string;
  type: 'ingreso' | 'egreso';
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque';
  startDate: string; // El input type="date" suele enviar string 'YYYY-MM-DD'

  // Aquí enviamos solo los IDs, no los objetos completos
  proveedorId: number;
  categoriaId: number;

}

@Injectable({
  providedIn: 'root'
})
export class GastosService {

  private apiUrl = environment.api.gastos;

  private apiUrls = `${environment.api.gastos}/balances`;
  constructor(private http: HttpClient) { }

  // Obtener todos los gastos (con filtrado frontend por rol)

  getExpenses(): Observable<Gasto[]> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.get<Gasto[]>(`${this.apiUrl}`, { headers });
  }

  // Obtener gasto por ID
  getExpenseById(id: number): Observable<Gasto> {
    return this.http.get<Gasto>(`${this.apiUrl}/${id}`);
  }

  // Crear un gasto nuevo
  createExpense(gasto: CreateGastoPayload): Observable<Gasto> {
    // 1. Recuperamos el token del almacenamiento local
    const token = localStorage.getItem('token');

    // 2. Creamos el Header
    const headers = { 'Authorization': `Bearer ${token}` };

    // 3. Lo enviamos junto a la petición
    return this.http.post<Gasto>(`${this.apiUrl}`, gasto, { headers });
  }

  // Actualizar un gasto
  updateExpense(id: number, expense: Gasto): Observable<Gasto> {
    return this.http.put<Gasto>(`${this.apiUrl}/${id}`, expense);
  }

  getEstadisticas(type: string, periodo: string, valor: string) {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, {
      params: { type, periodo, valor }
    });
  }

  getBalanceMensual(anio: number, mes: number) {
    return this.http.get<any>(`${this.apiUrl}/mensual?anio=${anio}&mes=${mes}`);
  }

  getBalanceAnual(anio: number) {
    return this.http.get<any>(`${this.apiUrl}/anual?anio=${anio}`);
  }

  // ==========================================
  // CONTABILIDAD - FINANZAS
  // ==========================================

  private contabilidadApiUrl = `${environment.api.gastos}/contabilidad`;

  getKpisFinanzas(start?: string, end?: string): Observable<KpisFinanzasResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<KpisFinanzasResponse>(`${this.contabilidadApiUrl}/finanzas/kpis`, { params });
  }

  getBalanceDias(start?: string, end?: string): Observable<BalanceDiasResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<BalanceDiasResponse>(`${this.contabilidadApiUrl}/finanzas/balance-dias`, { params });
  }

  getEvolucionFinanzas(start?: string, end?: string): Observable<EvolucionFinanzasResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<EvolucionFinanzasResponse>(`${this.contabilidadApiUrl}/finanzas/evolucion`, { params });
  }

  getTopDias(start?: string, end?: string, limit?: number): Observable<TopDiasResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<TopDiasResponse[]>(`${this.contabilidadApiUrl}/finanzas/top-dias`, { params });
  }

  getDistribucionFinanzas(start?: string, end?: string): Observable<DistribucionFinanzasResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<DistribucionFinanzasResponse>(`${this.contabilidadApiUrl}/finanzas/distribucion`, { params });
  }

  // ==========================================
  // CONTABILIDAD - MESAS
  // ==========================================

  getIngresosPorMesa(start?: string, end?: string, limit?: number): Observable<IngresosPorMesaResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<IngresosPorMesaResponse[]>(`${this.contabilidadApiUrl}/mesas/ingresos`, { params });
  }

  getHorasPuntaPorMesa(start?: string, end?: string): Observable<HorasPuntaPorMesaResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<HorasPuntaPorMesaResponse[]>(`${this.contabilidadApiUrl}/mesas/horas-punta`, { params });
  }

  // ==========================================
  // CONTABILIDAD - PRODUCTOS
  // ==========================================

  getTopProductos(start?: string, end?: string, limit?: number): Observable<TopProductoResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<TopProductoResponse[]>(`${this.contabilidadApiUrl}/productos/top`, { params });
  }

  getIngresosPorCategoria(start?: string, end?: string): Observable<IngresosPorCategoriaResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<IngresosPorCategoriaResponse[]>(`${this.contabilidadApiUrl}/productos/categoria`, { params });
  }

  // ==========================================
  // CONTABILIDAD - CLIENTES
  // ==========================================

  getKpisClientes(start?: string, end?: string): Observable<KpisClientesResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<KpisClientesResponse>(`${this.contabilidadApiUrl}/clientes/kpis`, { params });
  }

  getNuevosRecurrentesClientes(start?: string, end?: string): Observable<NuevosRecurrentesResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<NuevosRecurrentesResponse>(`${this.contabilidadApiUrl}/clientes/nuevos-recurrentes`, { params });
  }

  getActividadClientes(start?: string, end?: string): Observable<ActividadClientesResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<ActividadClientesResponse>(`${this.contabilidadApiUrl}/clientes/actividad`, { params });
  }

  getTopClientesGasto(start?: string, end?: string, limit?: number): Observable<TopClientesGastoResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<TopClientesGastoResponse>(`${this.contabilidadApiUrl}/clientes/top-gasto`, { params });
  }

  getTopClientesPedidos(start?: string, end?: string, limit?: number): Observable<TopClientesPedidosResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<TopClientesPedidosResponse>(`${this.contabilidadApiUrl}/clientes/top-pedidos`, { params });
  }

  getFrecuenciaClientes(start?: string, end?: string): Observable<FrecuenciaClientesResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<FrecuenciaClientesResponse>(`${this.contabilidadApiUrl}/clientes/frecuencia`, { params });
  }

  // ==========================================
  // CONTABILIDAD - DELIVERY
  // ==========================================

  getKpisDelivery(start?: string, end?: string): Observable<KpisDeliveryResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<KpisDeliveryResponse>(`${this.contabilidadApiUrl}/delivery/kpis`, { params });
  }

  getPedidosDeliveryPorDia(start?: string, end?: string): Observable<PedidosDeliveryPorDiaResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<PedidosDeliveryPorDiaResponse>(`${this.contabilidadApiUrl}/delivery/pedidos-dia`, { params });
  }

  getTiempoDespacho(start?: string, end?: string): Observable<TiempoDespachoResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<TiempoDespachoResponse>(`${this.contabilidadApiUrl}/delivery/tiempo-despacho`, { params });
  }

  getEstadosDelivery(start?: string, end?: string): Observable<EstadosDeliveryResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<EstadosDeliveryResponse>(`${this.contabilidadApiUrl}/delivery/estados`, { params });
  }

  getRecaudacionDelivery(start?: string, end?: string): Observable<RecaudacionDeliveryResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<RecaudacionDeliveryResponse>(`${this.contabilidadApiUrl}/delivery/recaudacion`, { params });
  }

  getClientesDelivery(start?: string, end?: string): Observable<ClientesDeliveryResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<ClientesDeliveryResponse>(`${this.contabilidadApiUrl}/delivery/clientes`, { params });
  }

  getTopBarrios(start?: string, end?: string, limit?: number): Observable<TopBarrioResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<TopBarrioResponse[]>(`${this.contabilidadApiUrl}/delivery/top-barrios`, { params });
  }

  // ==========================================
  // CONTABILIDAD - GASTOS
  // ==========================================

  getKpisGastos(start?: string, end?: string): Observable<KpisGastosResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<KpisGastosResponse>(`${this.contabilidadApiUrl}/gastos/kpis`, { params });
  }

  getGastosPorCategoria(start?: string, end?: string): Observable<GastosPorCategoriaResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<GastosPorCategoriaResponse[]>(`${this.contabilidadApiUrl}/gastos/por-categoria`, { params });
  }

  getGastosPorMedioPago(start?: string, end?: string): Observable<GastosPorMedioPagoResponse[]> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<GastosPorMedioPagoResponse[]>(`${this.contabilidadApiUrl}/gastos/por-medio-pago`, { params });
  }

  getEvolucionGastos(start?: string, end?: string): Observable<EvolucionGastosResponse> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<EvolucionGastosResponse>(`${this.contabilidadApiUrl}/gastos/evolucion`, { params });
  }

  deleteExpense(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.delete(`${this.apiUrl}/soft/${id}`, { headers });
  }

  updateExpenses(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.patch(`${this.apiUrl}/${id}`, data, { headers });
  }
}

// ==========================================
// INTERFACES PARA RESPONSES DEL BACKEND
// ==========================================

export interface KpisFinanzasResponse {
  ingresos: number;
  egresos: number;
  propinas: number;
  balance: number;
  porCobrar: number;
  costoDelivery: number;
  ticketBar:number;
}

export interface BalanceDiasResponse {
  labels: string[];
  ingresos: number[];
  egresos: number[];
  propinas: number[];
  balance: number[];
  costoDelivery: number[];
}

export interface EvolucionFinanzasResponse {
  labels: string[];
  balance: number[];
  porCobrar: number[];
  costoDelivery: number[];
  propinas:number[];
}

export interface TopDiasResponse {
  dia: string;
  recaudacion: number;
  costoDelivery: number;
}

export interface DistribucionFinanzasResponse {
  ingresos: number;
  propinas: number;
  costoDelivery: number;
}

export interface IngresosPorMesaResponse {
  mesa: string;
  ingresos: number;
}

export interface HorasPuntaPorMesaResponse {
  hora: number;
  ocupacion: number;
}

export interface TopProductoResponse {
  producto: string;
  unidades: number;
  total: number;
}

export interface IngresosPorCategoriaResponse {
  categoria: string;
  ingresos: number;
}

export interface KpisClientesResponse {
  total: number;
  nuevos: number;
  recurrentes: number;
}

export interface NuevosRecurrentesResponse {
  nuevos: number;
  recurrentes: number;
}

export interface ActividadClientesResponse {
  labels: string[];
  nuevos: number[];
  recurrentes: number[];
}

export interface TopClienteResponse {
  cliente: string;
  gasto: number;
}

export interface TopClientesGastoResponse {
  totalClientes: number;
  clientes: TopClienteResponse[];
}

export interface TopClientePedidosResponse {
  cliente: string;
  pedidos: number;
}

export interface TopClientesPedidosResponse {
  totalClientes: number;
  clientes: TopClientePedidosResponse[];
}

export interface FrecuenciaClientesResponse {
  ticketPromedio: number;
  frecuenciaPorNumPedidos: { numPedidos: number; clientes: number }[];
}

export interface KpisDeliveryResponse {
  pedidos: number;
  pagados: number;
  pendientes: number;
  tiempoPromedio: number;
  puntualidad: number;
  recaudado: number;
  costoEnvio: number;
}

export interface PedidosDeliveryPorDiaResponse {
  labels: string[];
  pedidos: number[];
}

export interface TiempoDespachoResponse {
  labels: string[];
  tiempoPromedio: number[];
}

export interface EstadosDeliveryResponse {
  pagado: number;
  pendiente: number;
  cancelado: number;
}

export interface RecaudacionDeliveryResponse {
  labels: string[];
  recaudacion: number[];
}

export interface ClientesDeliveryResponse {
  total: number;
  nuevos: number;
  recurrentes: number;
}

export interface TopBarrioResponse {
  barrio: string;
  pedidos: number;
}

export interface KpisGastosResponse {
  total: number;
  categoriaTop: string;
  categoriaTopMonto: number;
  medioTop: string;
  medioTopMonto: number;
}

export interface GastosPorCategoriaResponse {
  categoria: string;
  monto: number;
}

export interface GastosPorMedioPagoResponse {
  medio: string;
  monto: number;
}

export interface EvolucionGastosResponse {
  labels: string[];
  gastos: number[];
}
