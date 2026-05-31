import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mesa {
  id: number;
  numero_mesa: string;
  status: string;
  orders?: Order[];
}

export interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  numeroVenta: number;
  // ...otros campos que uses
}
interface MesasState {
  mesas: Mesa[];
  loading: boolean;
  error: any;
}

export interface CreateMesaDto {
  numero_mesa: string;
  status: string;
}

export interface UpdateMesaDto {
  numero_mesa?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MesaService {
  private apiUrl = environment.api.mesas; // Ajusta según tu backend
 private mesasSubject = new BehaviorSubject<any[]>([]);
  mesas$ = this.mesasSubject.asObservable();


  private mesasActualizadasSource = new Subject<void>();

  // Observable público para que otros componentes se suscriban
  mesasActualizadas$ = this.mesasActualizadasSource.asObservable();

  notificarCambioMesas() {
    this.mesasActualizadasSource.next();
  }
  constructor(private http: HttpClient) {}

  findAll(): Observable<Mesa[]> {
    this.http.get<any[]>(environment.api.mesas).subscribe(data => {
      this.mesasSubject.next(data);
    });
    return this.mesas$;
  }

  findOne(id: number): Observable<Mesa> {
    return this.http.get<Mesa>(`${this.apiUrl}/${id}`);
  }

  create(mesa: CreateMesaDto): Observable<Mesa> {
    return this.http.post<Mesa>(this.apiUrl, mesa);
  }

  update(id: number, mesa: UpdateMesaDto): Observable<Mesa> {
    return this.http.put<Mesa>(`${this.apiUrl}/${id}`, mesa);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

    actualizarEstadoMesa(mesaId: number, estado: string): Observable<any> {
    return this.http.put(`${environment.api.mesas}/${mesaId}/estado`, { status: estado })
      .pipe(
        tap(() => this.findAll().subscribe())
      );
  }

  getDetalleMesa(id: number) {
    return this.http.get(`${environment.api.mesas}/detalle/${id}`);
  }

marcarPedidoPagado(mesaId: any) {
  const idParsed = Number(mesaId);

  if (isNaN(idParsed) || idParsed <= 0) {
    return throwError(() => new Error('ID inválido en frontend'));
  }

  return this.http.patch(`${environment.api.mesas}/${idParsed}/pagar`, {});
}

  getMesa(mesaId: number): Observable<Mesa> {
    return this.http.get<Mesa>(`${this.apiUrl}/${mesaId}`);
  }



  crearNuevoPedido(mesaId: number): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/${mesaId}/nuevo-pedido`, {});
  }

  getPedidosActuales(mesaId: number, numeroVenta: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/${mesaId}/pedidos?numeroVenta=${numeroVenta}`);
  }

  getDetalleMesas(mesaId: number, fecha?: string) {
    let params = new HttpParams().set('mesaId', mesaId);

    if (fecha) {
      params = params.set('fecha', fecha);
    }

    return this.http.get(`${this.apiUrl}/ventas/detalle-mesa`, { params });
  }

    getDetalleMesaActual(mesaId: number): Observable<Mesa> {
    return this.http.get<Mesa>(`${this.apiUrl}/${mesaId}/detalle-actual`);
  }


}
