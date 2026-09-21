import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PedidoService, type Pedido } from './pedido.service';
import { environment } from '../../../environments/environment';

describe('PedidoService', () => {
  let service: PedidoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PedidoService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PedidoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe listar pedidos con GET /api/pedidos', () => {
    const mockPedidos: Pedido[] = [
      { id: 10, cliente: 'Juan', producto: 'Baguette', cantidad: 2, estado: 'En preparación' },
    ];

    service.listarPedidos().subscribe((pedidos) => {
      expect(pedidos.length).toBe(1);
      expect(pedidos[0].cliente).toBe('Juan');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/pedidos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPedidos);
  });

  it('debe ejecutar checkout con POST /api/pedidos/checkout', () => {
    const mockPedido: Pedido = {
      id: 25,
      cliente: 'Cliente demo',
      producto: 'Pan de masa madre (x2)',
      cantidad: 2,
      total: 9000,
      estado: 'En preparación',
    };

    service.checkout().subscribe((res) => {
      expect(res.id).toBe(25);
      expect(res.total).toBe(9000);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/pedidos/checkout`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPedido);
  });

  it('debe actualizar estado de un pedido con PUT /api/pedidos/:id', () => {
    const mockActualizado: Pedido = {
      id: 10,
      cliente: 'Juan',
      producto: 'Baguette',
      cantidad: 2,
      estado: 'En despacho',
    };

    service.actualizarPedido(10, { estado: 'En despacho' }).subscribe((res) => {
      expect(res.estado).toBe('En despacho');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/pedidos/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'En despacho' });
    req.flush(mockActualizado);
  });
});
