import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateProveedorDto {
    nombre: string;
    razon_social?: string;
    rut?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    categoriaId?: number;
}

export interface UpdateProveedorDto extends Partial<CreateProveedorDto> { }

export interface Proveedor {
    id: number;
    nombre: string;
    razon_social?: string;
    rut?: string;
    telefono?: string;
    email?: string;
    direccion?: string;

}

@Injectable({
    providedIn: 'root'
})
export class ProveedoresService {
    private apiUrl = environment.api.proveedores;

    constructor(private http: HttpClient) { }

    create(createProveedorDto: CreateProveedorDto): Observable<Proveedor> {
        return this.http.post<Proveedor>(this.apiUrl, createProveedorDto);
    }

    findAll(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.apiUrl);
    }

    findOne(id: number): Observable<Proveedor> {
        return this.http.get<Proveedor>(`${this.apiUrl}/${id}`);
    }

    update(id: number, updateProveedorDto: UpdateProveedorDto): Observable<Proveedor> {
        return this.http.patch<Proveedor>(`${this.apiUrl}/${id}`, updateProveedorDto);
    }

    remove(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
