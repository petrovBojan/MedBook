import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { PatientService } from '../../core/services/patient.service';
import { Patient } from '../../shared/models/patient.model';
import { PatientForm } from '../patient-form/patient-form';
import { LayoutService } from '../../core/services/layout.service';
import { formDialogConfig } from '../../shared/utils/dialog.utils';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
  imports: [RouterLink, DatePipe, FormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule]
})
export class PatientList {
  private readonly patientSrv = inject(PatientService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);

  // Fewer columns as the screen narrows; on phones the name cell carries the rest.
  readonly displayedColumns = computed(() => {
    if (this.layout.isHandset()) {
      return ['name'];
    }
    return this.layout.isCompact() ? ['name', 'dateOfBirth', 'phone'] : ['name', 'dateOfBirth', 'phone', 'email'];
  });
  readonly searchTerm = signal('');
  private readonly patients = toSignal(this.patientSrv.getPatients(), { initialValue: [] as Patient[] });

  readonly filteredPatients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.patients();
    }
    return this.patients().filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(term));
  });

  addPatient(): void {
    const dialogRef = this.dialog.open<PatientForm, unknown, Patient | undefined>(PatientForm, formDialogConfig());

    dialogRef.afterClosed().subscribe((patient) => {
      if (patient) {
        this.openPatient(patient);
      }
    });
  }

  openPatient(patient: Patient): void {
    this.router.navigate(['/patients', patient.id]);
  }
}
