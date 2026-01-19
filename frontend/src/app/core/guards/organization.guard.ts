import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { OrganizationService } from '../services/organization.service';

export const organizationGuard: CanActivateFn = () => {
  const orgService = inject(OrganizationService);
  const router = inject(Router);

  if (orgService.hasActiveOrg()) {
    return true;
  }

  router.navigate(['/organizations']);
  return false;
};
