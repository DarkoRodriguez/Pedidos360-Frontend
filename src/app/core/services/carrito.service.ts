import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CarritoItem = {
  id: number;
  producto: {
    id: number;
    nombre: string;
    precio: number;
    imagen: string;
  };
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
};

export type Carrito = {
  id: number;
  usuarioId: string;
  items: CarritoItem[];
  total: number;
  cantidadItems: number;
};

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/carrito`;

  obtener(): Observable<Carrito> {
    return this.http.get<Carrito>(this.baseUrl);
  }

  agregarProducto(productoId: number, cantidad: number): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.baseUrl}/productos/${productoId}`, { cantidad });
  }

  actualizarItem(itemId: number, cantidad: number): Observable<Carrito> {
    return this.http.put<Carrito>(`${this.baseUrl}/items/${itemId}`, { cantidad });
  }

  removerProducto(itemId: number): Observable<Carrito> {
    return this.http.delete<Carrito>(`${this.baseUrl}/items/${itemId}`);
  }

  limpiar(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }
}
