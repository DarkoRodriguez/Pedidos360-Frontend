import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Pedido {
  id?: number;
  usuarioId?: string;
  cliente: string;
  producto: string;
  cantidad: number;
  total?: number;
  estado: string;
  fechaCreacion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pedidos`;

  listarPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.url);
  }

  obtenerPedido(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.url}/${id}`);
  }

  checkout(): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/checkout`, {});
  }

  crearPedido(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.url, pedido);
  }

  actualizarPedido(id: number, pedido: Partial<Pedido>): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.url}/${id}`, pedido);
  }

  eliminarPedido(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
