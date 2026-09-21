import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const isAuth = await this.auth.restoreSession();
      if (isAuth) {
        await this.router.navigate(['/dashboard']);
      }
    } catch (err) {
      console.warn('Aviso comprobando sesión en landing:', err);
    }
  }

  protected async signIn(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.login();
      if (this.auth.isAuthenticated()) {
        await this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      console.error('Detalle del error en login:', err);
      const msg = err?.errorMessage || err?.message || 'No fue posible completar el inicio de sesión. Intenta nuevamente.';
      this.errorMessage.set(msg);
      this.isLoading.set(false);
    }
  }
}
