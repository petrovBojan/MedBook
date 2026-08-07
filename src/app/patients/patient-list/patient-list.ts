import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PatientService } from '../../core/services/patient.service';
import { Patient } from '../../shared/models/patient.model';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
  imports: [RouterLink, FormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule]
})
export class PatientList {
  private readonly patientSrv = inject(PatientService);

  readonly displayedColumns = ['name', 'dateOfBirth', 'phone', 'email'];
  readonly searchTerm = signal('');
  private readonly patients = toSignal(this.patientSrv.getPatients(), { initialValue: [] as Patient[] });

  readonly filteredPatients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.patients();
    }
    return this.patients().filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(term));
  });
}
