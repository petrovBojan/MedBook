import { Component, Input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { Weekday } from '../../shared/models/working-hours.model';

export type DayFormGroup = FormGroup<{
  day: FormControl<Weekday>;
  enabled: FormControl<boolean>;
  start: FormControl<Date>;
  end: FormControl<Date>;
}>;

@Component({
  selector: 'app-working-hours-editor',
  templateUrl: './working-hours-editor.html',
  styleUrl: './working-hours-editor.css',
  imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatTimepickerModule]
})
export class WorkingHoursEditor {
  @Input({ required: true }) days!: FormArray<DayFormGroup>;
}
