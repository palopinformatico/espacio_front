export interface CategoriaIngreso {
    id: number;
    nombre_cat: string;
}

export interface ClienteIngreso {
    id: number;
    nombre: string;
    rut: string;
    telefono?: number;
    email?: string;
    // Agrega otros campos de cliente si son necesarios
}

export interface Ingreso {
    id: number;
    concepto: string;
    fecha: Date | string; // TypeORM uses Date, but JSON often string
    metodo_pago: string;
    monto: number;
    categoria?: CategoriaIngreso;
    cliente?: ClienteIngreso;
}

export interface CreateIngresoDto {
    concepto: string;
    fecha: Date | string;
    metodo_pago: string;
    monto: number;
    categoriasIds: number[];
    clientesIds: number[];
}

export interface UpdateIngresoDto extends Partial<CreateIngresoDto> { }
