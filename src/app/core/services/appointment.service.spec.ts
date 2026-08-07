import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from './appointment.service';
import { AuthService } from './auth.service';
import { StaffService } from './staff.service';
import { PatientService } from './patient.service';
import { AppointmentDto, AppointmentStatus } from '../../shared/models/appointment.model';

describe('AppointmentService', () => {
  let appointmentSrv: AppointmentService;
  let doctorId: string;
  let patientId: string;

  function dto(overrides: Partial<AppointmentDto>): AppointmentDto {
    return {
      doctorId,
      patientId,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: AppointmentStatus.Scheduled,
      ...overrides
    };
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});

    appointmentSrv = TestBed.inject(AppointmentService);
    const authSrv = TestBed.inject(AuthService);
    const staffSrv = TestBed.inject(StaffService);
    const patientSrv = TestBed.inject(PatientService);

    await firstValueFrom(authSrv.login('dr.carter@medbook.demo', 'Doctor123!'));
    doctorId = (await firstValueFrom(staffSrv.getDoctors()))[0].id;
    patientId = (await firstValueFrom(patientSrv.getPatients()))[0].id;
  });

  it('creates an appointment when there is no conflict', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 10);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const appt = await firstValueFrom(
      appointmentSrv.createAppointment(dto({ start: start.toISOString(), end: end.toISOString() }))
    );

    expect(appt.id).toBeTruthy();
    expect(appt.doctorId).toBe(doctorId);
    expect(appt.createdBy).toBeTruthy();
  });

  it('rejects an overlapping appointment for the same doctor', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 11);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await firstValueFrom(
      appointmentSrv.createAppointment(dto({ start: start.toISOString(), end: end.toISOString() }))
    );

    const overlappingStart = new Date(start.getTime() + 15 * 60 * 1000);
    const overlappingEnd = new Date(overlappingStart.getTime() + 30 * 60 * 1000);

    await expect(
      firstValueFrom(
        appointmentSrv.createAppointment(
          dto({ start: overlappingStart.toISOString(), end: overlappingEnd.toISOString() })
        )
      )
    ).rejects.toThrow('already has an appointment');
  });

  it('allows a cancelled appointment to be overlapped', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 13);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const cancelled = await firstValueFrom(
      appointmentSrv.createAppointment(
        dto({ start: start.toISOString(), end: end.toISOString(), status: AppointmentStatus.Cancelled })
      )
    );
    expect(cancelled.status).toBe(AppointmentStatus.Cancelled);

    const rebooked = await firstValueFrom(
      appointmentSrv.createAppointment(dto({ start: start.toISOString(), end: end.toISOString() }))
    );
    expect(rebooked.id).toBeTruthy();
  });

  it('rejects an appointment where end is before start', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 12);
    const end = new Date(start.getTime() - 60 * 1000);

    await expect(
      firstValueFrom(appointmentSrv.createAppointment(dto({ start: start.toISOString(), end: end.toISOString() })))
    ).rejects.toThrow('End time must be after the start time.');
  });
});
