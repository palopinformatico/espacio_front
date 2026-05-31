import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// DTOs para TicketBar
export interface CreateTicketBarDto {
    tipoTicket: 'normal' | 'rapido';
    totalTicket: number;
    propinaBar?: number;
    estadoTicket: number; // 0=abierto, 1=cerrado
    idUser?: number;
    idProduct: number;
    cantidad?: number;
}

export interface UpdateTicketBarDto {
    tipoTicket?: 'normal' | 'rapido';
    totalTicket?: number;
    propinaBar?: number;
    estadoTicket?: number;
}

export interface TicketBar {
    idticketBar: number;
    tipoTicket: string;
    totalTicket: number;
    propinaBar: number;
    estadoTicket: number;
    idUser: number;
    idProduct: number;
    user?: any;
    product?: any;
}

@Injectable({
    providedIn: 'root'
})
export class TicketBarService {
    private apiUrl = environment.api.ticketBar;

    // 🔔 Subject para notificar cambios
    private ticketsActualizadosSubject = new Subject<void>();
    public ticketsActualizados$ = this.ticketsActualizadosSubject.asObservable();

    constructor(private http: HttpClient) { }

    /**
     * Crear un nuevo ticket de bar
     */
    create(dto: CreateTicketBarDto): Observable<TicketBar> {
        return this.http.post<TicketBar>(this.apiUrl, dto).pipe(
            tap(() => {
                console.log('✅ Ticket bar creado, notificando cambios...');
                this.notificarCambioTickets();
            })
        );
    }

    /**
     * Obtener todos los tickets
     */
    findAll(): Observable<TicketBar[]> {
        return this.http.get<TicketBar[]>(this.apiUrl);
    }

    /**
     * Obtener tickets por usuario
     */
    findByUser(idUser: number): Observable<TicketBar[]> {
        return this.http.get<TicketBar[]>(`${this.apiUrl}/user/${idUser}`);
    }

    /**
     * Obtener tickets por estado (0=abierto, 1=cerrado)
     */
    findByEstado(estado: number): Observable<TicketBar[]> {
        return this.http.get<TicketBar[]>(`${this.apiUrl}/estado/${estado}`);
    }

    /**
     * Obtener un ticket específico
     */
    findOne(id: number): Observable<TicketBar> {
        return this.http.get<TicketBar>(`${this.apiUrl}/${id}`);
    }

    /**
     * Actualizar un ticket
     */
    update(id: number, dto: UpdateTicketBarDto): Observable<TicketBar> {
        return this.http.patch<TicketBar>(`${this.apiUrl}/${id}`, dto).pipe(
            tap(() => {
                console.log('✅ Ticket bar actualizado, notificando cambios...');
                this.notificarCambioTickets();
            })
        );
    }

    /**
     * Eliminar un ticket
     */
    remove(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            tap(() => {
                console.log('✅ Ticket bar eliminado, notificando cambios...');
                this.notificarCambioTickets();
            })
        );
    }

    /**
     * Cerrar un ticket (cambiar estado a 1)
     */
    cerrarTicket(id: number): Observable<TicketBar> {
        return this.update(id, { estadoTicket: 1 });
    }

    /**
     * Notificar a todos los suscriptores que los tickets han cambiado
     */
    notificarCambioTickets(): void {
        this.ticketsActualizadosSubject.next();
    }
}
