import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PedidoService, type Pedido } from '../../../../core/services/pedido.service';
import { ProductoService, type Producto } from '../../../../core/services/producto.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);

  // Tab activo
  protected readonly activeTab = signal<'resumen' | 'pedidos' | 'productos' | 'rbac'>('resumen');

  // Datos
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly toastMessage = signal<string | null>(null);

  // Filtros
  protected readonly pedidoEstadoFilter = signal<string>('TODOS');
  protected readonly productoCategoriaFilter = signal<string>('TODOS');
  protected readonly searchQuery = signal<string>('');

  // Simulación y Gestión RBAC (ADMIN, GERENTE, COCINA, REPARTIDOR, CUSTOMER)
  protected readonly simulatedRole = signal<'ADMIN' | 'GERENTE' | 'COCINA' | 'REPARTIDOR' | 'CUSTOMER'>('ADMIN');

  // Permite alternar vistas si estamos en Modo Demo o si el usuario de Entra ID tiene rol ADMIN
  protected readonly isSimulationAllowed = computed(() => {
    return this.auth.isDemoMode || this.auth.userRole() === 'ADMIN';
  });

  // Permisos computados según el rol real proveniente de Entra ID (o simulación autorizada)
  protected readonly effectiveRole = computed<'ADMIN' | 'GERENTE' | 'COCINA' | 'REPARTIDOR' | 'CUSTOMER'>(() => {
    if (this.auth.isDemoMode) {
      return this.simulatedRole();
    }

    const realRole = this.auth.userRole();
    // Si el usuario es ADMIN en Azure Entra ID, se le permite previsualizar la interfaz de otros roles
    if (realRole === 'ADMIN') {
      return this.simulatedRole();
    }

    // En producción con Entra ID, se aplica estrictamente el rol asignado en Azure
    if (realRole === 'GERENTE') return 'GERENTE';
    if (realRole === 'COCINA') return 'COCINA';
    if (realRole === 'REPARTIDOR') return 'REPARTIDOR';
    if (realRole === 'CUSTOMER') return 'CUSTOMER';

    return 'CUSTOMER';
  });

  protected readonly canCreateEditProducts = computed(() => {
    const role = this.effectiveRole();
    return role === 'ADMIN' || role === 'GERENTE';
  });

  protected readonly canDeleteProducts = computed(() => {
    return this.effectiveRole() === 'ADMIN';
  });

  protected readonly canManageOrders = computed(() => {
    return true; // Todos los roles autenticados pueden operar pedidos según sus permisos
  });

  protected readonly canDeleteOrders = computed(() => {
    return this.effectiveRole() === 'ADMIN';
  });

  protected readonly canAccessRbacTab = computed(() => {
    const role = this.effectiveRole();
    return role === 'ADMIN' || role === 'GERENTE';
  });

  // Modales
  protected readonly isPedidoModalOpen = signal(false);
  protected readonly isProductoModalOpen = signal(false);
  protected readonly isDeleteConfirmOpen = signal(false);
  protected readonly editingPedidoId = signal<number | null>(null);
  protected readonly editingProductoId = signal<number | null>(null);
  protected readonly deleteTarget = signal<{ type: 'pedido' | 'producto'; id: number; label: string } | null>(null);

  // Formularios
  protected pedidoForm: {
    cliente: string;
    producto: string;
    cantidad: number;
    total: number;
    estado: string;
  } = {
    cliente: '',
    producto: '',
    cantidad: 1,
    total: 0,
    estado: 'En preparación',
  };

  protected productoForm: {
    nombre: string;
    categoria: string;
    descripcion: string;
    precio: number;
    stock: number;
    imagen: string;
    badge: string;
    activo: boolean;
  } = {
    nombre: '',
    categoria: 'Pan fresco',
    descripcion: '',
    precio: 0,
    stock: 20,
    imagen: '',
    badge: '',
    activo: true,
  };

  // Métricas calculadas
  protected readonly metrics = computed(() => {
    const p = this.pedidos();
    const prod = this.productos();

    const pedidosActivos = p.filter((o) => o.estado !== 'Entregado' && o.estado !== 'Cancelado').length;
    const enPreparacion = p.filter((o) => o.estado === 'En preparación').length;
    const enDespacho = p.filter((o) => o.estado === 'En despacho').length;
    const stockCritico = prod.filter((pr) => pr.stock <= 10).length;
    const totalVentas = p.reduce((acc, curr) => acc + (curr.total || 0), 0);

    return [
      { label: 'Pedidos Activos', value: pedidosActivos.toString(), detail: `${p.length} registrados`, tone: 'gold' },
      { label: 'En Preparación', value: enPreparacion.toString(), detail: 'En horno y armado', tone: 'orange' },
      { label: 'En Despacho', value: enDespacho.toString(), detail: 'En ruta de entrega', tone: 'green' },
      { label: 'Stock Crítico', value: stockCritico.toString(), detail: `${prod.length} productos en total`, tone: 'red' },
    ];
  });

  // Pedidos filtrados
  protected readonly filteredPedidos = computed(() => {
    const p = this.pedidos();
    const filter = this.pedidoEstadoFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return p.filter((item) => {
      const matchEstado = filter === 'TODOS' || item.estado.toUpperCase() === filter.toUpperCase();
      const matchQuery =
        !q ||
        (item.cliente && item.cliente.toLowerCase().includes(q)) ||
        (item.producto && item.producto.toLowerCase().includes(q)) ||
        (item.id && item.id.toString().includes(q));
      return matchEstado && matchQuery;
    });
  });

  // Productos filtrados
  protected readonly filteredProductos = computed(() => {
    const prods = this.productos();
    const cat = this.productoCategoriaFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return prods.filter((item) => {
      const matchCat = cat === 'TODOS' || item.categoria === cat;
      const matchQuery = !q || item.nombre.toLowerCase().includes(q) || item.descripcion?.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.auth.restoreSession();

    if (!this.auth.isDemoMode && this.auth.userRole() === 'CUSTOMER') {
      this.showToast('⛔ Acceso restringido: El rol Cliente (CUSTOMER) no tiene permisos para acceder al Panel Operativo.');
      setTimeout(() => this.router.navigate(['/']), 1500);
      return;
    }

    this.cargarDatos();
  }

  protected cargarDatos(): void {
    this.isLoading.set(true);
    this.cargarPedidos();
    this.cargarProductos();
  }

  protected cargarPedidos(): void {
    this.pedidoService.listarPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('Error cargando pedidos desde el backend:', err);
        this.isLoading.set(false);
      },
    });
  }

  protected cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: (data) => {
        this.productos.set(data);
      },
      error: (err) => {
        console.warn('Error cargando productos desde el backend:', err);
      },
    });
  }

  protected selectTab(tab: 'resumen' | 'pedidos' | 'productos' | 'rbac'): void {
    if (tab === 'rbac' && !this.canAccessRbacTab()) {
      this.showToast(`⛔ Acceso Denegado: Tu rol (${this.effectiveRole()}) no tiene permisos para acceder a la Matriz de Roles (RBAC). Requiere ADMIN o GERENTE.`);
      return;
    }
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  protected setSimulatedRole(role: 'ADMIN' | 'GERENTE' | 'COCINA' | 'REPARTIDOR' | 'CUSTOMER'): void {
    this.simulatedRole.set(role);
    this.showToast(`Rol activo cambiado a: ${role}`);
  }

  // === CRUD PEDIDOS ===

  protected abrirCrearPedidoModal(): void {
    this.editingPedidoId.set(null);
    this.pedidoForm = {
      cliente: '',
      producto: '',
      cantidad: 1,
      total: 0,
      estado: 'En preparación',
    };
    this.isPedidoModalOpen.set(true);
  }

  protected abrirEditarPedidoModal(pedido: Pedido): void {
    this.editingPedidoId.set(pedido.id ?? null);
    this.pedidoForm = {
      cliente: pedido.cliente,
      producto: pedido.producto,
      cantidad: pedido.cantidad,
      total: pedido.total ?? 0,
      estado: pedido.estado,
    };
    this.isPedidoModalOpen.set(true);
  }

  protected cerrarPedidoModal(): void {
    this.isPedidoModalOpen.set(false);
    this.editingPedidoId.set(null);
  }

  protected guardarPedido(): void {
    if (!this.pedidoForm.cliente || !this.pedidoForm.producto) {
      this.showToast('Por favor completa el cliente y los productos.');
      return;
    }

    const id = this.editingPedidoId();
    if (id !== null) {
      // Actualizar
      this.pedidoService.actualizarPedido(id, this.pedidoForm).subscribe({
        next: (actualizado) => {
          this.pedidos.update((list) => list.map((p) => (p.id === id ? actualizado : p)));
          this.cerrarPedidoModal();
          this.showToast(`Pedido #${id} actualizado con éxito.`);
        },
        error: (err) => {
          console.error('Error actualizando pedido:', err);
          this.showToast('Error al actualizar pedido.');
        },
      });
    } else {
      // Crear
      this.pedidoService.crearPedido(this.pedidoForm).subscribe({
        next: (creado) => {
          this.pedidos.update((list) => [creado, ...list]);
          this.cerrarPedidoModal();
          this.showToast(`Pedido #${creado.id} creado con éxito.`);
        },
        error: (err) => {
          console.error('Error creando pedido:', err);
          this.showToast('Error al crear pedido.');
        },
      });
    }
  }

  protected cambiarEstadoRapido(pedido: Pedido, nuevoEstado: string): void {
    if (!pedido.id) return;
    this.pedidoService.actualizarPedido(pedido.id, { estado: nuevoEstado }).subscribe({
      next: (actualizado) => {
        this.pedidos.update((list) => list.map((p) => (p.id === pedido.id ? actualizado : p)));
        this.showToast(`Estado de Pedido #${pedido.id} actualizado a "${nuevoEstado}".`);
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        this.showToast('Error al cambiar estado.');
      },
    });
  }

  // === CRUD PRODUCTOS ===

  protected abrirCrearProductoModal(): void {
    if (!this.canCreateEditProducts()) {
      this.showToast(`⛔ Acceso Denegado: Tu rol (${this.effectiveRole()}) no tiene permisos para crear productos (Requiere ADMIN o GERENTE).`);
      return;
    }
    this.editingProductoId.set(null);
    this.productoForm = {
      nombre: '',
      categoria: 'Pan fresco',
      descripcion: '',
      precio: 3000,
      stock: 25,
      imagen: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=85',
      badge: '',
      activo: true,
    };
    this.isProductoModalOpen.set(true);
  }

  protected abrirEditarProductoModal(producto: Producto): void {
    if (!this.canCreateEditProducts()) {
      this.showToast(`⛔ Acceso Denegado: Tu rol (${this.effectiveRole()}) no tiene permisos para editar productos (Requiere ADMIN o GERENTE).`);
      return;
    }
    this.editingProductoId.set(producto.id);
    this.productoForm = {
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      precio: producto.precio,
      stock: producto.stock,
      imagen: producto.imagen,
      badge: producto.badge || '',
      activo: producto.activo,
    };
    this.isProductoModalOpen.set(true);
  }

  protected cerrarProductoModal(): void {
    this.isProductoModalOpen.set(false);
    this.editingProductoId.set(null);
  }

  protected guardarProducto(): void {
    if (!this.canCreateEditProducts()) {
      this.showToast(`⛔ Acceso Denegado: Tu rol (${this.effectiveRole()}) no tiene permisos para realizar cambios en productos.`);
      return;
    }

    if (!this.productoForm.nombre || !this.productoForm.precio) {
      this.showToast('Por favor completa el nombre y precio del producto.');
      return;
    }

    const id = this.editingProductoId();
    if (id !== null) {
      // Actualizar
      this.productoService.actualizar(id, this.productoForm).subscribe({
        next: (actualizado) => {
          this.productos.update((list) => list.map((pr) => (pr.id === id ? actualizado : pr)));
          this.cerrarProductoModal();
          this.showToast(`Producto "${actualizado.nombre}" actualizado.`);
        },
        error: (err) => {
          console.error('Error actualizando producto:', err);
          if (err.status === 403) {
            this.showToast(`⛔ Acceso Denegado (403): Tu rol (${this.effectiveRole()}) no tiene permisos en el backend para modificar este producto.`);
          } else {
            this.showToast('Error al actualizar producto.');
          }
        },
      });
    } else {
      // Crear
      this.productoService.crear(this.productoForm).subscribe({
        next: (creado) => {
          this.productos.update((list) => [creado, ...list]);
          this.cerrarProductoModal();
          this.showToast(`Producto "${creado.nombre}" añadido al catálogo.`);
        },
        error: (err) => {
          console.error('Error creando producto:', err);
          if (err.status === 403) {
            this.showToast(`⛔ Acceso Denegado (403): Tu rol (${this.effectiveRole()}) no tiene permisos en el backend para crear productos.`);
          } else {
            this.showToast('Error al crear producto.');
          }
        },
      });
    }
  }

  protected toggleActivoProducto(producto: Producto): void {
    if (!this.canCreateEditProducts()) {
      this.showToast(`⛔ Acceso Denegado: Tu rol (${this.effectiveRole()}) no tiene permisos para alternar el estado del producto.`);
      return;
    }
    this.productoService.actualizar(producto.id, { activo: !producto.activo }).subscribe({
      next: (actualizado) => {
        this.productos.update((list) => list.map((pr) => (pr.id === producto.id ? actualizado : pr)));
        this.showToast(`Estado de "${producto.nombre}" cambiado a ${actualizado.activo ? 'Activo' : 'Inactivo'}.`);
      },
      error: (err) => {
        console.error('Error cambiando estado de producto:', err);
        if (err.status === 403) {
          this.showToast(`⛔ Acceso Denegado (403): Operación no permitida para el rol ${this.effectiveRole()}.`);
        }
      },
    });
  }

  // === CONFIRMACIÓN DE ELIMINACIÓN ===

  protected confirmarEliminar(type: 'pedido' | 'producto', id: number, label: string): void {
    if (type === 'producto' && !this.canDeleteProducts()) {
      this.showToast(`⛔ Acceso Denegado: Solo el rol ADMIN puede eliminar productos del catálogo. Tu rol actual es ${this.effectiveRole()}.`);
      return;
    }
    if (type === 'pedido' && !this.canDeleteOrders()) {
      this.showToast(`⛔ Acceso Denegado: Solo el rol ADMIN puede eliminar registros de pedidos. Tu rol actual es ${this.effectiveRole()}.`);
      return;
    }
    this.deleteTarget.set({ type, id, label });
    this.isDeleteConfirmOpen.set(true);
  }

  protected cancelarEliminar(): void {
    this.isDeleteConfirmOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected ejecutarEliminacion(): void {
    const target = this.deleteTarget();
    if (!target) return;

    if (target.type === 'pedido') {
      this.pedidoService.eliminarPedido(target.id).subscribe({
        next: () => {
          this.pedidos.update((list) => list.filter((p) => p.id !== target.id));
          this.showToast(`Pedido #${target.id} eliminado.`);
          this.cancelarEliminar();
        },
        error: (err) => {
          console.error('Error eliminando pedido:', err);
          if (err.status === 403) {
            this.showToast(`⛔ Acceso Denegado (403): Solo el rol ADMIN puede eliminar pedidos en el backend.`);
          } else {
            this.showToast('Error al eliminar pedido.');
          }
          this.cancelarEliminar();
        },
      });
    } else {
      this.productoService.eliminar(target.id).subscribe({
        next: () => {
          this.productos.update((list) => list.filter((pr) => pr.id !== target.id));
          this.showToast(`Producto "${target.label}" eliminado del catálogo.`);
          this.cancelarEliminar();
        },
        error: (err) => {
          console.error('Error eliminando producto:', err);
          if (err.status === 403) {
            this.showToast(`⛔ Acceso Denegado (403): Solo el rol ADMIN puede eliminar productos en el backend.`);
          } else {
            this.showToast('Error al eliminar producto.');
          }
          this.cancelarEliminar();
        },
      });
    }
  }

  protected getEstadoTone(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'en preparación':
      case 'preparacion':
        return 'orange';
      case 'en despacho':
      case 'despacho':
        return 'green';
      case 'confirmado':
      case 'listo':
        return 'blue';
      case 'entregado':
        return 'gold';
      case 'cancelado':
        return 'red';
      default:
        return 'orange';
    }
  }

  protected showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }
}

