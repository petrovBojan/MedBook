import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login)
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
      }
    ]
  },
  { path: '**', redirectTo: 'calendar' }
];
