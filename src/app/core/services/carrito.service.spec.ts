import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CarritoService, type Carrito } from './carrito.service';
import { environment } from '../../../environments/environment';

describe('CarritoService', () => {
  let service: CarritoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CarritoService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CarritoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe obtener el carrito del usuario con GET /api/carrito', () => {
    const mockCarrito: Carrito = {
      id: 1,
      usuarioId: 'user-demo',
      items: [],
      total: 0,
      cantidadItems: 0,
    };

    service.obtener().subscribe((carrito) => {
      expect(carrito.usuarioId).toBe('user-demo');
      expect(carrito.items.length).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/carrito`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCarrito);
  });

  it('debe agregar un producto con POST /api/carrito/productos/:id', () => {
    const mockCarrito: Carrito = {
      id: 1,
      usuarioId: 'user-demo',
      items: [
        {
          id: 10,
          producto: { id: 3, nombre: 'Croissant', precio: 2400, imagen: '' },
          cantidad: 2,
          precioUnitario: 2400,
          subtotal: 4800,
        },
      ],
      total: 4800,
      cantidadItems: 2,
    };

    service.agregarProducto(3, 2).subscribe((carrito) => {
      expect(carrito.cantidadItems).toBe(2);
      expect(carrito.total).toBe(4800);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/carrito/productos/3`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cantidad: 2 });
    req.flush(mockCarrito);
  });

  it('debe limpiar el carrito con DELETE /api/carrito', () => {
    service.limpiar().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/carrito`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
