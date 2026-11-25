import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Replaces <ProtectedRoute>. Use `data: { adminOnly: true }` on a route to restrict it to admins. */
export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureLoaded();

  if (!auth.user) return router.createUrlTree(['/login']);
  if (route.data['adminOnly'] && auth.user.role !== 'Admin') return router.createUrlTree(['/dashboard']);
  return true;
};
