import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./features/landing/pages/product-landing-page/product-landing-page.component').then((module) => module.ProductLandingPageComponent) },
	{ path: 'login', loadComponent: () => import('./features/landing/pages/landing-page/landing-page.component').then((module) => module.LandingPageComponent) },
	{ path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then((module) => module.DashboardPageComponent) },
	{ path: '**', redirectTo: '' },
];
