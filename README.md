# Pedidos360 - Frontend (Angular 22)

Aplicación Web Frontend desarrollada con **Angular 22** (Standalone Components, Signals), autenticada con **Microsoft Entra ID (MSAL Angular)** y desplegada sobre **Nginx en HTTPS**.

---

## 🏗️ Arquitectura y Tecnologías

* **Framework**: Angular 22 / TypeScript / Vanilla CSS.
* **Autenticación**: `@azure/msal-angular` & `@azure/msal-browser` (OIDC / OAuth2 PKCE Flow).
* **Servidor Web**: **Nginx** sobre servidor Linux AWS EC2.
* **Seguridad Web**: Certificado SSL Autofirmado HTTPS + Redirección obligatoria HTTP ➡️ HTTPS.
* **API Gateway**: Conectado a **AWS API Gateway** (`https://<API_ID>.execute-api.<REGION>.amazonaws.com/dev/v1/`).

---

## 🎨 Características de la Aplicación

1. **Vitrina / Catálogo de Productos (Acceso Público)**:
   * Navegación por productos y categorías sin necesidad de iniciar sesión.
   * Búsqueda dinámica y vista detallada de productos.
2. **Autenticación con Microsoft Entra ID**:
   * Single Sign-On (SSO) oficial con la cuenta institucional/personal de Microsoft.
   * Manejo automático de tokens de acceso mediante `MsalInterceptor`.
3. **Carrito de Compras Interactivo**:
   * Agregar productos, modificar cantidades y eliminar ítems con actualización en tiempo real mediante Angular Signals.
   * Proceso de **Checkout (Confirmar Pedido)** directamente vinculado a la API REST.
4. **Dashboard y Simulador de Roles (RBAC)**:
   * Panel de control multi-rol con soporte para los 5 roles de la organización:
     * **`ADMIN`**: Control total + eliminación de registros.
     * **`GERENTE`**: Creación y edición de productos + gestión de inventario.
     * **`COCINA`**: Panel de comandas y actualización a *En preparación*.
     * **`REPARTIDOR`**: Panel de despacho y actualización a *En despacho* / *Entregado*.
     * **`CUSTOMER`**: Consulta de compras realizadas y estado en tiempo real.

---

## ⚙️ Configuración del Entorno (`environment.ts`)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://<TU_DOMINIO_O_IP_FRONTEND>/api', // Enrutado vía Nginx Reverse Proxy / AWS API Gateway
  azure: {
    tenantId: '<TU_AZURE_TENANT_ID>',
    clientId: '<TU_AZURE_CLIENT_ID>',
    scope: 'api://<TU_AZURE_CLIENT_ID>/access_as_user',
    redirectUri: 'https://<TU_DOMINIO_O_IP_FRONTEND>/',
    postLogoutRedirectUri: 'https://<TU_DOMINIO_O_IP_FRONTEND>/',
  },
};
```

---

## 📦 Compilación y Despliegue

### 1. Ejecutar localmente (Desarrollo)
```bash
npm start
# La aplicación abrirá en http://localhost:4200
```

### 2. Generar Build de Producción
```bash
ng build --configuration production
# Los archivos compilados se generan en dist/pedidos360/browser
```

### 3. Transferir y Desplegar en Servidor Nginx (EC2)
```powershell
# Enviar archivos a la máquina EC2
scp -i <RUTA_A_TU_CLAVE.pem> -r dist/pedidos360/browser/* ubuntu@<IP_EC2_FRONTEND>:~/browser/
```

En la terminal SSH del servidor:
```bash
sudo cp -r ~/browser/* /var/www/pedidos360/
sudo chown -R www-data:www-data /var/www/pedidos360
sudo systemctl restart nginx
```
