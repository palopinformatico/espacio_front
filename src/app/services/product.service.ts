import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface PaginationDto<T> {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  data: T[];
}

export interface Product {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: number;
}

export interface CategoryDto {
  id: number;
  name: string;
}

export interface ProductDto {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: CategoryDto;
}


@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.api.products;
  constructor(private http: HttpClient) { }

  getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/buscar`);
  }

  createProduct(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/crear`, formData);
  }


  updateProduct(id: number, form: any, imageFile?: File): Observable<any> {
    const formData = new FormData();

    // 🔹 Campos base
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', String(form.price));
    if (form.cantidad !== undefined) formData.append('cantidad', String(form.cantidad));

    // 🔹 Campos de disponibilidad
    if (form.ofreceLocal !== undefined) {
      formData.append('ofreceLocal', form.ofreceLocal ? 'true' : 'false');
    }
    if (form.ofreceDelivery !== undefined) {
      formData.append('ofreceDelivery', form.ofreceDelivery ? 'true' : 'false');
    }

    // 🔹 Categorías — siempre se envían como JSON string
    if (form.categories && form.categories.length > 0) {
      formData.append('categories', JSON.stringify(form.categories));
    } else {
      formData.append('categories', JSON.stringify([]));
    }

    // 🔹 Imagen si se selecciona una nueva
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // 🔹 Petición PATCH (o PUT dependiendo del backend)
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }




  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  buscarProductos(params: {
    nombre?: string;
    categoryIds?: number[]; // ahora un array
    page?: number;
    limit?: number;
  }): Observable<any> {
    let query = new HttpParams();

    if (params.nombre) query = query.set('nombre', params.nombre);

    if (params.categoryIds && params.categoryIds.length > 0) {
      // enviamos como string separados por comas: "1,2,3"
      query = query.set('categorias', params.categoryIds.join(','));
    }

    if (params.page) query = query.set('page', params.page.toString());
    if (params.limit) query = query.set('limit', params.limit.toString());

    return this.http.get(`${this.apiUrl}/buscar`, { params: query });
  }





  getAllProducts(): Observable<ProductDto[]> {
    return this.http.get<ProductDto[]>(`${this.apiUrl}/finds`);
  }

  // Método para construir la URL completa de la imagen de un producto
  getProductImageUrl(imageUrl: string): string {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
      return '/logo.png';
    }

    // Si ya es una URL completa, devolverla tal cual
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Usar la URL base del entorno (localhost en desarrollo, producción en prod)
    const baseUrl = environment.apiBaseUrl || 'https://espacioboulevard.com';

    // Si empieza con /uploads/, agregar el dominio base
    if (imageUrl.startsWith('/uploads/')) {
      return `${baseUrl}${imageUrl}`;
    }

    // Si empieza con uploads/ (sin barra inicial), agregar barra y dominio
    if (imageUrl.startsWith('uploads/')) {
      return `${baseUrl}/${imageUrl}`;
    }

    // Para cualquier otro caso, asumir que es solo el nombre del archivo
    return `${baseUrl}/uploads/${imageUrl}`;
  }
}
