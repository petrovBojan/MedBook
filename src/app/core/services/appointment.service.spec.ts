import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from './appointment.service';
import { apiInterceptor } from '../http/api.interceptor';
import { AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';
import { environment } from '../../../environments/environment';
import { provideTranslocoTesting } from '../i18n/transloco-testing';

// The scheduling rules themselves live (and are tested) in MedBook.Api - these tests
// cover the HTTP contract: what's sent, and how the API's answers reach the caller.
describe('AppointmentService', () => {
  const baseUrl = `${environment.apiUrl}/appointments`;
  let service: AppointmentService;
  let httpMock: HttpTestingController;

  const dto: AppointmentDto = {
    doctorId: 'staff-carter',
    patientId: 'patient-1',
    start: '2026-10-05T08:00:00.000Z',
    end: '2026-10-05T08:30:00.000Z',
    status: AppointmentStatus.Scheduled
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoTesting()
      ]
    });
    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates an appointment with a POST of the form data', async () => {
    const result = firstValueFrom(service.createAppointment(dto));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ ...dto, id: 'appt-1', clinicId: 'clinic-sunrise', createdBy: 'staff-carter', createdAt: '', updatedAt: '' });

    expect((await result).id).toBe('appt-1');
  });

  it("surfaces the API's reason when a booking is rejected", async () => {
    const result = firstValueFrom(service.createAppointment(dto));
    httpMock
      .expectOne(baseUrl)
      .flush({ title: 'Request rejected', detail: 'This doctor already has an appointment during that time.' }, { status: 400, statusText: 'Bad Request' });

    await expect(result).rejects.toThrow('already has an appointment');
  });

  it('updates an appointment with a PUT to its id', async () => {
    const result = firstValueFrom(service.updateAppointment('appt-1', { ...dto, status: AppointmentStatus.Cancelled }));

    const req = httpMock.expectOne(`${baseUrl}/appt-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.status).toBe(AppointmentStatus.Cancelled);
    req.flush({ ...dto, id: 'appt-1' });
    await result;
  });

  it('returns undefined for an appointment that does not exist', async () => {
    const result = firstValueFrom(service.getAppointment('missing'));
    httpMock.expectOne(`${baseUrl}/missing`).flush({ detail: 'Appointment not found.' }, { status: 404, statusText: 'Not Found' });

    expect(await result).toBeUndefined();
  });

  describe('checkAvailability', () => {
    const slot = { doctorId: dto.doctorId, start: dto.start, end: dto.end, status: dto.status };

    it('emits null when the slot is free, sending the appointment being edited as excludeId', async () => {
      const result = firstValueFrom(service.checkAvailability(slot, 'appt-1'));

      const req = httpMock.expectOne(`${baseUrl}/check-availability`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ...slot, excludeId: 'appt-1' });
      req.flush({ available: true });

      expect(await result).toBeNull();
    });

    it('emits the reason when the slot is taken', async () => {
      const result = firstValueFrom(service.checkAvailability(slot));
      httpMock
        .expectOne(`${baseUrl}/check-availability`)
        .flush({ available: false, message: 'Dr. Carter doesn\'t work on Saturdays.' });

      expect(await result).toBe("Dr. Carter doesn't work on Saturdays.");
    });
  });
});
