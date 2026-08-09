import { Injectable, inject } from '@angular/core';
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { BrowserStorageService } from './browser-storage.service';
import { Clinic } from '../../shared/models/clinic.model';
import { StaffCredentials, StaffMember, StaffRole } from '../../shared/models/staff-member.model';
import { Gender, Patient } from '../../shared/models/patient.model';
import { Appointment, AppointmentStatus } from '../../shared/models/appointment.model';
import { createDefaultWorkingHours } from '../../shared/models/working-hours.model';

interface MockDatabase {
  clinics: Clinic[];
  staff: StaffMember[];
  credentials: StaffCredentials[];
  patients: Patient[];
  appointments: Appointment[];
}

const DB_KEY = 'medbook_db';

// This is the stand-in "backend" for phase 1: a single in-memory + localStorage-backed
// store, seeded with demo data. Every method here is written the way an HTTP call would
// be shaped (plain data in, plain data out) so the feature services that sit on top of it
// can be repointed at a real API later without their callers changing.
@Injectable({
  providedIn: 'root'
})
export class MockDbService {
  private readonly storage = inject(BrowserStorageService);
  private db: MockDatabase = this.backfillWorkingHours(this.storage.getItem<MockDatabase>(DB_KEY) ?? this.seed());

  private persist(): void {
    this.storage.setItem(DB_KEY, this.db);
  }

  // Data persisted before working hours existed on Clinic/StaffMember won't have the
  // field - fill it in so scheduling validation has something to check against instead
  // of silently skipping.
  private backfillWorkingHours(db: MockDatabase): MockDatabase {
    let changed = false;
    for (const clinic of db.clinics) {
      if (!clinic.workingHours) {
        clinic.workingHours = createDefaultWorkingHours();
        changed = true;
      }
    }
    for (const member of db.staff) {
      if (!member.workingHours) {
        member.workingHours = createDefaultWorkingHours();
        changed = true;
      }
    }
    if (changed) {
      this.storage.setItem(DB_KEY, db);
    }
    return db;
  }

  // --- clinics ---

  getClinic(id: string): Clinic | undefined {
    return this.db.clinics.find((c) => c.id === id);
  }

  updateClinic(id: string, changes: Partial<Clinic>): Clinic | undefined {
    const clinic = this.getClinic(id);
    if (!clinic) {
      return undefined;
    }
    Object.assign(clinic, changes);
    this.persist();
    return clinic;
  }

  // --- staff ---

  getStaffByClinic(clinicId: string): StaffMember[] {
    return this.db.staff.filter((s) => s.clinicId === clinicId);
  }

  getStaffById(id: string): StaffMember | undefined {
    return this.db.staff.find((s) => s.id === id);
  }

  getStaffByEmail(email: string): StaffMember | undefined {
    return this.db.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
  }

  getCredentials(staffId: string): StaffCredentials | undefined {
    return this.db.credentials.find((c) => c.staffId === staffId);
  }

  updateStaffMember(id: string, changes: Partial<StaffMember>): StaffMember | undefined {
    const staff = this.getStaffById(id);
    if (!staff) {
      return undefined;
    }
    Object.assign(staff, changes);
    this.persist();
    return staff;
  }

  // --- patients ---

  getPatients(clinicId: string): Patient[] {
    return this.db.patients.filter((p) => p.clinicId === clinicId);
  }

  getPatient(id: string): Patient | undefined {
    return this.db.patients.find((p) => p.id === id);
  }

  createPatient(patient: Patient): Patient {
    this.db.patients.push(patient);
    this.persist();
    return patient;
  }

  updatePatient(id: string, changes: Partial<Patient>): Patient | undefined {
    const patient = this.getPatient(id);
    if (!patient) {
      return undefined;
    }
    Object.assign(patient, changes);
    this.persist();
    return patient;
  }

  // --- appointments ---

  getAppointments(clinicId: string): Appointment[] {
    return this.db.appointments.filter((a) => a.clinicId === clinicId);
  }

  getAppointment(id: string): Appointment | undefined {
    return this.db.appointments.find((a) => a.id === id);
  }

  createAppointment(appointment: Appointment): Appointment {
    this.db.appointments.push(appointment);
    this.persist();
    return appointment;
  }

  updateAppointment(id: string, changes: Partial<Appointment>): Appointment | undefined {
    const appointment = this.getAppointment(id);
    if (!appointment) {
      return undefined;
    }
    Object.assign(appointment, changes);
    this.persist();
    return appointment;
  }

  private seed(): MockDatabase {
    const clinicId = 'clinic-sunrise';
    const doctorCarterId = 'staff-carter';
    const doctorLeeId = 'staff-lee';
    const employeeNovakId = 'staff-novak';

    const patients: Patient[] = [
      this.seedPatient(clinicId, 'John', 'Miller', '1985-03-12', Gender.Male, 'Penicillin allergy'),
      this.seedPatient(clinicId, 'Sarah', 'Johnson', '1990-07-22', Gender.Female),
      this.seedPatient(clinicId, 'Liam', 'Brown', '2016-11-02', Gender.Male, 'Asthma, uses inhaler'),
      this.seedPatient(clinicId, 'Olivia', 'Davis', '1975-01-30', Gender.Female),
      this.seedPatient(clinicId, 'Noah', 'Wilson', '1999-09-09', Gender.Male)
    ];

    const today = startOfDay(new Date());
    const at = (dayOffset: number, hour: number, minute = 0) =>
      setMinutes(setHours(addDays(today, dayOffset), hour), minute).toISOString();

    const appointments: Appointment[] = [
      this.seedAppointment(
        clinicId,
        doctorCarterId,
        patients[0].id,
        at(0, 9),
        at(0, 9, 30),
        'Annual check-up',
        AppointmentStatus.Scheduled,
        doctorCarterId
      ),
      this.seedAppointment(
        clinicId,
        doctorCarterId,
        patients[1].id,
        at(0, 11),
        at(0, 11, 30),
        'Follow-up on blood pressure',
        AppointmentStatus.Scheduled,
        employeeNovakId
      ),
      this.seedAppointment(
        clinicId,
        doctorLeeId,
        patients[2].id,
        at(1, 10),
        at(1, 10, 30),
        'Asthma review',
        AppointmentStatus.Scheduled,
        doctorLeeId
      ),
      this.seedAppointment(
        clinicId,
        doctorCarterId,
        patients[3].id,
        at(-1, 14),
        at(-1, 14, 30),
        'Flu symptoms',
        AppointmentStatus.Completed,
        doctorCarterId
      ),
      this.seedAppointment(
        clinicId,
        doctorLeeId,
        patients[4].id,
        at(2, 15),
        at(2, 15, 30),
        'General consultation',
        AppointmentStatus.Scheduled,
        employeeNovakId
      ),
      this.seedAppointment(
        clinicId,
        doctorCarterId,
        patients[1].id,
        at(3, 9, 30),
        at(3, 10),
        'Vaccination',
        AppointmentStatus.Cancelled,
        doctorCarterId
      )
    ];

    this.db = {
      clinics: [
        {
          id: clinicId,
          name: 'Sunrise Family Clinic',
          address: '221B Baker Street, Springfield',
          phone: '+1 555-0142',
          email: 'info@sunrisefamilyclinic.demo',
          workingHours: createDefaultWorkingHours()
        }
      ],
      staff: [
        {
          id: doctorCarterId,
          clinicId,
          firstName: 'Emily',
          lastName: 'Carter',
          email: 'dr.carter@medbook.demo',
          role: StaffRole.Doctor,
          specialty: 'Family Medicine',
          color: '#3f7cac',
          workingHours: createDefaultWorkingHours()
        },
        {
          id: doctorLeeId,
          clinicId,
          firstName: 'Marcus',
          lastName: 'Lee',
          email: 'dr.lee@medbook.demo',
          role: StaffRole.Doctor,
          specialty: 'Pediatrics',
          color: '#a35d6a',
          workingHours: createDefaultWorkingHours()
        },
        {
          id: employeeNovakId,
          clinicId,
          firstName: 'Grace',
          lastName: 'Novak',
          email: 'grace.novak@medbook.demo',
          role: StaffRole.Employee,
          color: '#6b8f71',
          workingHours: createDefaultWorkingHours()
        }
      ],
      credentials: [
        { staffId: doctorCarterId, password: 'Doctor123!' },
        { staffId: doctorLeeId, password: 'Doctor123!' },
        { staffId: employeeNovakId, password: 'Employee123!' }
      ],
      patients,
      appointments
    };
    this.persist();
    return this.db;
  }

  private seedPatient(
    clinicId: string,
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    gender: Gender,
    notes?: string
  ): Patient {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      clinicId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      notes,
      createdAt: now,
      updatedAt: now
    };
  }

  private seedAppointment(
    clinicId: string,
    doctorId: string,
    patientId: string,
    start: string,
    end: string,
    reason: string,
    status: AppointmentStatus,
    createdBy: string
  ): Appointment {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      clinicId,
      doctorId,
      patientId,
      start,
      end,
      reason,
      status,
      createdBy,
      createdAt: now,
      updatedAt: now
    };
  }
}
