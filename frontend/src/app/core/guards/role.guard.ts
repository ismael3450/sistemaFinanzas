import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { OrganizationService } from '../services/organization.service';
import { Role } from '../models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const orgService = inject(OrganizationService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as Role[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (orgService.hasPermission(requiredRoles)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
