import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { apiInterceptor } from '../http/api.interceptor';
import { StaffMember, StaffRole } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

const loginUrl = `${environment.apiUrl}/auth/login`;

const carter: StaffMember = {
  id: 'staff-carter',
  clinicId: 'clinic-sunrise',
  firstName: 'Emily',
  lastName: 'Carter',
  email: 'dr.carter@medbook.demo',
  role: StaffRole.Doctor
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function logIn(expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()): Promise<StaffMember> {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));
    httpMock.expectOne(loginUrl).flush({ token: 'jwt-token', expiresAt, user: carter });
    return result;
  }

  it('posts the credentials and exposes the returned user', async () => {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'Doctor123!'));

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'dr.carter@medbook.demo', password: 'Doctor123!' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ token: 'jwt-token', expiresAt: new Date(Date.now() + 60_000).toISOString(), user: carter });

    expect((await result).email).toBe('dr.carter@medbook.demo');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.getToken()).toBe('jwt-token');
    expect(service.getCurrentUser()?.id).toBe('staff-carter');
  });

  it("rejects invalid credentials with the API's message and stays logged out", async () => {
    const result = firstValueFrom(service.login('dr.carter@medbook.demo', 'wrong-password'));
    httpMock
      .expectOne(loginUrl)
      .flush({ title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toThrow('Invalid email or password.');
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });

  it('treats an expired session as logged out', async () => {
    await logIn(new Date(Date.now() - 1000).toISOString());

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('logs out and clears the session', async () => {
    await logIn();

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });

  it('clears the pre-API mock data left in localStorage', () => {
    localStorage.setItem('medbook_db', '{}');
    localStorage.setItem('medbook_token', '"x"');

    TestBed.runInInjectionContext(() => new AuthService());

    expect(localStorage.getItem('medbook_db')).toBeNull();
    expect(localStorage.getItem('medbook_token')).toBeNull();
  });
});
