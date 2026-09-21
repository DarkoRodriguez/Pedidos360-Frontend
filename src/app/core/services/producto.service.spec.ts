import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductoService, type Producto } from './producto.service';
import { environment } from '../../../environments/environment';

describe('ProductoService', () => {
  let service: ProductoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductoService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProductoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe listar productos con GET /api/productos', () => {
    const mockProductos: Producto[] = [
      {
        id: 1,
        nombre: 'Masa madre',
        categoria: 'Pan fresco',
        descripcion: 'Pan artesanal',
        precio: 4500,
        stock: 20,
        imagen: 'img.jpg',
        activo: true,
      },
    ];

    service.listar().subscribe((productos) => {
      expect(productos.length).toBe(1);
      expect(productos[0].nombre).toBe('Masa madre');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/productos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProductos);
  });

  it('debe crear un producto con POST /api/productos', () => {
    const nuevoProducto: Omit<Producto, 'id'> = {
      nombre: 'Croissant',
      categoria: 'Dulce',
      descripcion: 'Croissant francés',
      precio: 2500,
      stock: 15,
      imagen: 'croissant.jpg',
      activo: true,
    };
    const creado: Producto = { id: 2, ...nuevoProducto };

    service.crear(nuevoProducto).subscribe((res) => {
      expect(res.id).toBe(2);
      expect(res.nombre).toBe('Croissant');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/productos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoProducto);
    req.flush(creado);
  });

  it('debe eliminar un producto con DELETE /api/productos/:id', () => {
    service.eliminar(5).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/productos/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
