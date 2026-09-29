import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { clinicAdminGuard } from './core/guards/clinic-admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login)
  },
  {
    // Public: reached from an invitation link. The link itself is the credential.
    path: 'register',
    loadComponent: () => import('./auth/register/register').then((m) => m.Register)
  },
  {
    // The platform owner's panel - its own layout, no clinic navigation.
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./admin/clinic-list/clinic-list').then((m) => m.ClinicList) },
      {
        path: 'clinics/:id',
        loadComponent: () => import('./admin/clinic-detail/clinic-detail').then((m) => m.ClinicDetail)
      }
    ]
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      {
        path: 'calendar',
        loadComponent: () => import('./calendar/calendar').then((m) => m.Calendar)
      },
      {
        path: 'patients',
        loadComponent: () => import('./patients/patient-list/patient-list').then((m) => m.PatientList)
      },
      {
        path: 'patients/:id',
        loadComponent: () => import('./patients/patient-detail/patient-detail').then((m) => m.PatientDetail)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings').then((m) => m.Settings)
      },
      {
        path: 'team',
        canActivate: [clinicAdminGuard],
        loadComponent: () => import('./team/team').then((m) => m.Team)
      }
    ]
  },
  { path: '**', redirectTo: 'calendar' }
];
