import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const active = await auth.restoreSession();
  if (!active) {
    return router.createUrlTree(['/login']);
  }

  // Denegar acceso al Dashboard para usuarios con rol CUSTOMER en Entra ID
  if (!auth.isDemoMode && auth.userRole() === 'CUSTOMER') {
    if (typeof window !== 'undefined') {
      alert('⛔ Acceso denegado: Tu usuario posee el rol Cliente (CUSTOMER), el cual no tiene permisos para ingresar al Panel Operativo.');
    }
    return router.createUrlTree(['/']);
  }

  return true;
};
