import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Horario } from './models/horario.model';

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private apiUrl = environment.api.horarios;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`);
  }

  updateHorario(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  getAll(): Observable<Horario[]> {
    return this.http.get<Horario[]>(this.apiUrl);
  }

  checkRestaurantAvailability(): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-availability`);
  }
}
