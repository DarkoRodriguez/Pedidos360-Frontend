import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagen: string;
  stock: number;
  badge?: string;
  activo: boolean;
};

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  listar(categoria?: string): Observable<Producto[]> {
    let params = new HttpParams();
    if (categoria && categoria !== 'Todos') {
      params = params.set('categoria', categoria);
    }
    return this.http.get<Producto[]>(this.baseUrl, { params });
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.baseUrl}/${id}`);
  }

  crear(producto: Omit<Producto, 'id'>): Observable<Producto> {
    return this.http.post<Producto>(this.baseUrl, producto);
  }

  actualizar(id: number, producto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, producto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
