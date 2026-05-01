import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth        = inject(AuthService);
  const router      = inject(Router);
  const rolesValidos: string[] = route.data['roles'];
  const rolActual               = auth.getRolActual();

  if (rolActual && rolesValidos.includes(rolActual)) return true;

  router.navigate(['/login']);
  return false;
};