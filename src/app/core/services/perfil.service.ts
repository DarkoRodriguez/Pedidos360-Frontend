import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilUsuario {
  sub: string;
  nombre: string;
  email: string;
  roles: string[];
  scope?: string;
  issuer?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/perfil`;

  obtenerPerfil(): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(this.url);
  }
}
