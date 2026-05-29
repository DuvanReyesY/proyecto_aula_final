import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth         = inject(AuthService);
  const router       = inject(Router);
  const rolesValidos: string[] = route.data['roles'];
  const rolActual    = auth.getRolActual();

  // Rol permitido → dejar pasar
  if (rolActual && rolesValidos.includes(rolActual)) return true;

  // Sin sesión → login
  if (!rolActual) {
    router.navigate(['/login']);
    return false;
  }

  // Rol no permitido → redirigir a su home
  if (rolActual === 'cliente') {
    router.navigate(['/layout/cliente-home']);
  } else {
    router.navigate(['/layout/dashboard']);
  }
  return false;
};