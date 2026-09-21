import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProductoService, type Producto } from '../../../../core/services/producto.service';
import { CarritoService, type Carrito } from '../../../../core/services/carrito.service';
import { PedidoService, type Pedido } from '../../../../core/services/pedido.service';

const DEFAULT_PRODUCTS: Producto[] = [
  { id: 1, nombre: 'Masa madre clásica', categoria: 'Pan fresco', descripcion: 'Pan de masa madre horneado hoy', precio: 4900, imagen: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=700&q=85', stock: 50, badge: 'Favorito', activo: true },
  { id: 2, nombre: 'Roll de canela', categoria: 'Dulce', descripcion: 'Roll de canela con glaseado de vainilla', precio: 2800, imagen: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=700&q=85', stock: 30, badge: 'Nuevo', activo: true },
  { id: 3, nombre: 'Croissant de mantequilla', categoria: 'Dulce', descripcion: 'Croissant laminado artesanal', precio: 2400, imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=85', stock: 40, activo: true },
  { id: 4, nombre: 'Focaccia de romero', categoria: 'Salado', descripcion: 'Focaccia con aceite de oliva y romero fresco', precio: 5500, imagen: 'https://images.unsplash.com/photo-1619535860434-cf9b902a53c2?auto=format&fit=crop&w=700&q=85', stock: 25, activo: true },
  { id: 5, nombre: 'Pan ciabatta', categoria: 'Pan fresco', descripcion: 'Ciabatta italiana crujiente', precio: 3200, imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=85', stock: 35, activo: true },
  { id: 6, nombre: 'Donut de chocolate', categoria: 'Dulce', descripcion: 'Donut glaseado con chocolate derretido', precio: 1800, imagen: 'https://images.unsplash.com/photo-1451947580459-6cfa73784d05?auto=format&fit=crop&w=700&q=85', stock: 45, activo: true },
  { id: 7, nombre: 'Empanada de queso', categoria: 'Salado', descripcion: 'Empanada rellena de queso fundido', precio: 2200, imagen: 'https://images.unsplash.com/photo-1566521005885-8dcc7f8d76c7?auto=format&fit=crop&w=700&q=85', stock: 60, activo: true },
  { id: 8, nombre: 'Baguette francesa', categoria: 'Pan fresco', descripcion: 'Baguette auténtica francesa', precio: 3800, imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=85', stock: 28, activo: true },
];

@Component({
  selector: 'app-product-landing-page',
  imports: [CommonModule, NgOptimizedImage, RouterModule],
  templateUrl: './product-landing-page.component.html',
  styleUrl: './product-landing-page.component.css',
})
export class ProductLandingPageComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly productoService = inject(ProductoService);
  private readonly carritoService = inject(CarritoService);
  private readonly pedidoService = inject(PedidoService);

  protected readonly activeSlide = signal(0);
  protected readonly activeCategory = signal('Todos');
  protected readonly isLoading = signal(false);
  protected readonly isCheckingOut = signal(false);
  protected readonly isCartOpen = signal(false);
  protected readonly cart = signal<Carrito | null>(null);
  protected readonly checkoutSuccess = signal<Pedido | null>(null);
  protected readonly toastMessage = signal<string | null>(null);
  protected readonly products = signal<Producto[]>(DEFAULT_PRODUCTS);
  protected readonly categories = ['Todos', 'Pan fresco', 'Dulce', 'Salado'];
  protected readonly slides = [
    {
      eyebrow: 'Colección de temporada',
      title: 'El buen día empieza con pan.',
      copy: 'Descubre recetas horneadas esta mañana, preparadas para compartir en casa o en tu local.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=85',
      tone: 'gold',
    },
    {
      eyebrow: 'Recién salido del horno',
      title: 'Crujiente por fuera. Memorable por dentro.',
      copy: 'Una selección de favoritos artesanales para llenar tu mesa de momentos simples.',
      image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=1400&q=85',
      tone: 'orange',
    },
    {
      eyebrow: 'Para compartir',
      title: 'Más manos, más sabor.',
      copy: 'Arma tu pedido con clásicos de la casa y recibe todo coordinado en un solo lugar.',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1400&q=85',
      tone: 'green',
    },
  ];

  protected readonly cartItemCount = computed(() => {
    const c = this.cart();
    return c?.cantidadItems ?? 0;
  });

  protected readonly filteredProducts = computed(() => {
    const category = this.activeCategory();
    const prods = this.products();
    return category === 'Todos' ? prods : prods.filter((product) => product.categoria === category);
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.auth.restoreSession();
      this.cargarProductos();
      if (this.auth.isAuthenticated()) {
        this.cargarCarrito();
      }
    }
  }

  private cargarProductos() {
    this.isLoading.set(true);
    this.productoService.listar().subscribe({
      next: (productos) => {
        if (productos && productos.length > 0) {
          this.products.set(productos);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('Backend no disponible, usando vitrina inicial:', err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected cargarCarrito(): void {
    this.carritoService.obtener().subscribe({
      next: (c) => this.cart.set(c),
      error: (err) => console.warn('No se pudo cargar el carrito:', err),
    });
  }

  protected toggleCart(): void {
    if (!this.auth.isAuthenticated()) {
      this.showToast('Inicia sesión para revisar tu carrito.');
      this.signIn();
      return;
    }
    const nextState = !this.isCartOpen();
    this.isCartOpen.set(nextState);
    if (nextState) {
      this.cargarCarrito();
    }
  }

  protected closeCart(): void {
    this.isCartOpen.set(false);
  }

  protected nextSlide(): void {
    this.activeSlide.update((slide) => (slide + 1) % this.slides.length);
  }

  protected previousSlide(): void {
    this.activeSlide.update((slide) => (slide - 1 + this.slides.length) % this.slides.length);
  }

  protected selectSlide(index: number): void {
    this.activeSlide.set(index);
  }

  protected selectCategory(category: string): void {
    this.activeCategory.set(category);
  }

  protected agregarAlCarrito(productoId: number): void {
    if (!this.auth.isAuthenticated()) {
      this.showToast('Inicia sesión para agregar productos.');
      this.signIn();
      return;
    }

    this.carritoService.agregarProducto(productoId, 1).subscribe({
      next: (nuevoCarrito) => {
        this.cart.set(nuevoCarrito);
        this.showToast('¡Producto agregado al carrito!');
      },
      error: (err) => {
        console.error('Error agregando al carrito:', err);
        this.showToast('Error al agregar al carrito.');
      },
    });
  }

  protected actualizarCantidad(itemId: number, cantidad: number): void {
    this.carritoService.actualizarItem(itemId, cantidad).subscribe({
      next: (c) => this.cart.set(c),
      error: (err) => console.error('Error actualizando cantidad:', err),
    });
  }

  protected eliminarItem(itemId: number): void {
    this.carritoService.removerProducto(itemId).subscribe({
      next: (c) => {
        this.cart.set(c);
        this.showToast('Producto eliminado del carrito.');
      },
      error: (err) => console.error('Error eliminando item:', err),
    });
  }

  protected ejecutarCheckout(): void {
    if (!this.auth.isAuthenticated()) {
      this.signIn();
      return;
    }

    const c = this.cart();
    if (!c || !c.items || c.items.length === 0) {
      this.showToast('Tu carrito está vacío.');
      return;
    }

    this.isCheckingOut.set(true);
    this.pedidoService.checkout().subscribe({
      next: (pedidoCreado) => {
        this.isCheckingOut.set(false);
        this.cart.set(null);
        this.isCartOpen.set(false);
        this.checkoutSuccess.set(pedidoCreado);
        this.showToast(`¡Pedido #${pedidoCreado.id} confirmado con éxito!`);
      },
      error: (err) => {
        this.isCheckingOut.set(false);
        console.error('Error en checkout:', err);
        const mensaje = err.error?.error || 'Error al procesar el checkout. Intenta de nuevo.';
        this.showToast(mensaje);
      },
    });
  }

  protected closeCheckoutSuccess(): void {
    this.checkoutSuccess.set(null);
  }

  protected irADashboard(): void {
    if (!this.auth.isDemoMode && this.auth.userRole() === 'CUSTOMER') {
      this.showToast('⛔ Acceso restringido: Tu cuenta (Cliente / CUSTOMER) no tiene permisos para acceder al Panel Operativo.');
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  protected showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  protected async signIn(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.auth.login();
      if (this.auth.isAuthenticated()) {
        this.cargarCarrito();
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    this.cart.set(null);
    this.isCartOpen.set(false);
  }
}

