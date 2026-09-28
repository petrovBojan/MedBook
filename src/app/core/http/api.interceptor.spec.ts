import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiInterceptor } from './api.interceptor';
import { ApiError } from './api-error';
import { AuthService } from '../services/auth.service';
import { StaffRole } from '../../shared/models/staff-member.model';
import { environment } from '../../../environments/environment';

describe('apiInterceptor', () => {
  const patientsUrl = `${environment.apiUrl}/patients`;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authSrv: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authSrv = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  async function logIn(): Promise<void> {
    const result = firstValueFrom(authSrv.login('dr.carter@medbook.demo', 'Doctor123!'));
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: { id: 'staff-carter', clinicId: 'clinic-sunrise', firstName: 'Emily', lastName: 'Carter', email: 'dr.carter@medbook.demo', role: StaffRole.Doctor }
    });
    await result;
  }

  it('sends the session cookie and the CSRF header on API calls', async () => {
    const result = firstValueFrom(http.post(patientsUrl, {}));
    const req = httpMock.expectOne(patientsUrl);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await result;
  });

  it('leaves requests to other origins alone', async () => {
    await logIn();

    const result = firstValueFrom(http.get('https://example.com/data'));
    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.has('X-Requested-With')).toBe(false);
    req.flush({});
    await result;
  });

  it('logs out and redirects to login when the session is rejected', async () => {
    await logIn();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const result = firstValueFrom(http.get(patientsUrl));
    httpMock.expectOne(patientsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toBeInstanceOf(ApiError);
    expect(authSrv.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('does not treat a failed login (401) as an expired session', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    const result = firstValueFrom(authSrv.login('dr.carter@medbook.demo', 'wrong'));
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toThrow('Invalid email or password.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it("uses a ProblemDetails 'detail' as the error message", async () => {
    const result = firstValueFrom(http.get(patientsUrl));
    httpMock
      .expectOne(patientsUrl)
      .flush({ title: 'Request rejected', detail: 'This doctor already has an appointment during that time.' }, { status: 400, statusText: 'Bad Request' });

    await expect(result).rejects.toMatchObject({
      status: 400,
      message: 'This doctor already has an appointment during that time.'
    });
  });

  it('falls back to the first field message for validation errors', async () => {
    const result = firstValueFrom(http.get(patientsUrl));
    httpMock.expectOne(patientsUrl).flush(
      { title: 'One or more validation errors occurred.', errors: { LastName: ['The LastName field is required.'] } },
      { status: 400, statusText: 'Bad Request' }
    );

    await expect(result).rejects.toThrow('The LastName field is required.');
  });

  it('explains when the server cannot be reached', async () => {
    const result = firstValueFrom(http.get(patientsUrl));
    httpMock.expectOne(patientsUrl).error(new ProgressEvent('error'));

    await expect(result).rejects.toThrow("Can't reach the server");
  });
});
