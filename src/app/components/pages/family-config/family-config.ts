import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, output, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { Footer } from '../../footer/footer';
import { Header } from '../../header/header';
import {
  HealthDeclarationFormService,
  PersonGender,
  PersonGroup,
} from '../../../services/health-declaration-form.service';
import { LocationFilterResponse, LocationService } from '../../../services/location.service';
import { FAMILY_GENDER_OPTIONS, PersonGender as PersonGenderEnum } from '../../../constants/app-enums';

type GenderOption = {
  value: Exclude<PersonGender, ''>;
  label: string;
};

@Component({
  selector: 'app-family-config',
  imports: [Footer, Header, ReactiveFormsModule],
  templateUrl: './family-config.html',
  styleUrl: './family-config.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyConfig {
  protected readonly declaration = inject(HealthDeclarationFormService);
  private readonly locationService = inject(LocationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();
  protected readonly currentYear = new Date().getFullYear();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly back = output<void>();
  readonly next = output<void>();

  protected readonly form = this.declaration.form;
  protected readonly people = this.declaration.peopleArray;
  protected readonly searchQuery = signal(this.declaration.familyLocationQuery());
  protected readonly locationInteracted = signal(false);
  protected readonly selectedLocationId = signal(this.declaration.familyLocation()?.locationId ?? null);
  protected readonly selectedLocationData = signal<LocationFilterResponse | null>(this.declaration.familyLocation());
  protected readonly isDropdownOpen = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly locationResults = signal<LocationFilterResponse[]>([]);
  protected readonly editingPersonIndex = signal<number | null>(this.initialEditingPersonIndex());
  private blurCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly setupSteps = [
    { number: 1, label: 'Personal details', active: true },
    { number: 2, label: 'Advice', active: false },
    { number: 3, label: 'Formalities', active: false },
    { number: 4, label: 'Completion', active: false },
  ] as const;

  protected readonly personGender = PersonGenderEnum;
  protected readonly genderOptions: readonly GenderOption[] = FAMILY_GENDER_OPTIONS;

  protected readonly hasSelectedZip = computed(() => this.selectedLocationId() !== null && !!this.selectedLocationData()?.zipCode);
  protected readonly showLocationDropdown = computed(
    () =>
      this.isDropdownOpen() &&
      this.canSearchLocations(this.searchQuery()) &&
      (this.isLoading() || this.locationResults().length > 0),
  );
  protected readonly personCompleteness = computed(() => {
    this.declaration.peopleVersion();
    return this.people.controls.map((person) => person.valid);
  });
  protected readonly firstIncompleteIndex = computed(() =>
    this.personCompleteness().findIndex((complete) => !complete),
  );
  protected readonly canAddPerson = computed(() => this.hasSelectedZip() && this.firstIncompleteIndex() === -1);

  constructor() {
    this.syncPersonBasicsAvailability();

    this.searchSubject
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!this.canSearchLocations(query)) {
            this.locationResults.set([]);
            this.isLoading.set(false);
            return of([]);
          }

          this.isLoading.set(true);
          return this.locationService.searchLocations(query).pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.locationResults.set(results);
        this.isLoading.set(false);
      });
  }

  protected onSearchInput(event: Event): void {
    this.cancelBlurClose();
    const value = (event.target as HTMLInputElement).value;
    this.locationInteracted.set(true);

    if (!value.trim()) {
      this.clearLocation();
      return;
    }

    const selectedLocation = this.selectedLocationData();
    if (selectedLocation && value !== this.locationDisplayValue(selectedLocation)) {
      this.clearSelectedLocation();
      this.editingPersonIndex.set(0);
    }

    this.searchQuery.set(value);
    if (!this.canSearchLocations(value)) {
      this.locationResults.set([]);
      this.isDropdownOpen.set(false);
      this.isLoading.set(false);
      return;
    }

    this.isDropdownOpen.set(true);
    this.isLoading.set(true);
    this.searchSubject.next(value);
  }

  protected selectLocation(location: LocationFilterResponse, event?: Event): void {
    this.cancelBlurClose();
    event?.preventDefault();
    const query = this.locationDisplayValue(location);
    this.selectedLocationId.set(location.locationId);
    this.selectedLocationData.set(location);
    this.searchQuery.set(query);
    this.locationInteracted.set(true);
    this.locationResults.set([]);
    this.isDropdownOpen.set(false);
    this.isLoading.set(false);
    this.declaration.setFamilyLocation(location, query);
    this.syncPersonBasicsAvailability();

    const editingIndex = this.editingPersonIndex();
    if (editingIndex !== null && this.people.at(editingIndex)?.valid) {
      this.editingPersonIndex.set(null);
    }
  }

  protected clearLocation(): void {
    this.cancelBlurClose();
    this.searchQuery.set('');
    this.locationResults.set([]);
    this.isDropdownOpen.set(false);
    this.isLoading.set(false);
    this.clearSelectedLocation();
    this.editingPersonIndex.set(0);
  }

  protected onFocus(): void {
    this.cancelBlurClose();
    if (this.canSearchLocations(this.searchQuery())) {
      this.isDropdownOpen.set(true);
    }
  }

  protected onBlur(): void {
    this.locationInteracted.set(true);
    this.cancelBlurClose();
    this.blurCloseTimeoutId = setTimeout(() => {
      this.isDropdownOpen.set(false);
      this.blurCloseTimeoutId = null;
    }, 180);
  }

  protected addPerson(): void {
    this.locationInteracted.set(true);

    if (!this.hasSelectedZip() || !this.canAddPerson()) {
      this.editFirstIncompletePerson();
      return;
    }

    this.declaration.addPerson();
    this.syncPersonBasicsAvailability();
    this.editingPersonIndex.set(this.people.length - 1);
  }

  protected removePerson(index: number): void {
    this.declaration.removePerson(index);
    const editingIndex = this.editingPersonIndex();
    if (editingIndex === index) {
      this.editingPersonIndex.set(null);
    } else if (editingIndex !== null && editingIndex > index) {
      this.editingPersonIndex.set(editingIndex - 1);
    }
  }

  protected startQuestionnaire(): void {
    this.locationInteracted.set(true);
    if (!this.hasSelectedZip() || !this.declaration.familySetupValid()) {
      this.declaration.markFamilySetupTouched();
      this.editFirstIncompletePerson();
      this.scheduleAfterValidationRender(() => this.scrollToFirstFamilyInvalid());
      return;
    }

    this.declaration.visitPerson(0);
    this.next.emit();
  }

  protected editPerson(index: number): void {
    this.editingPersonIndex.set(index);
  }

  protected isEditing(index: number): boolean {
    return this.editingPersonIndex() === index;
  }

  protected onGenderChange(person: PersonGroup, index: number): void {
    if (person.controls.gender.value === PersonGenderEnum.Baby) {
      person.controls.birthYear.setValue(String(this.currentYear));
    }

    this.handleProfileDraftChange(person, index);
  }

  protected handleProfileDraftChange(person: PersonGroup, index: number): void {
    this.declaration.markPersonIncomplete(index);
    person.updateValueAndValidity();
    this.declaration.peopleVersion.update((version) => version + 1);

    if (person.invalid) {
      return;
    }

    if (!this.hasSelectedZip()) {
      this.locationInteracted.set(true);
      this.editingPersonIndex.set(index);
      return;
    }

    this.editingPersonIndex.set(null);
  }

  protected handleBirthYearInput(event: Event, person: PersonGroup, index: number): void {
    const input = event.target as HTMLInputElement;
    const numericValue = input.value.replace(/\D/g, '').slice(0, 4);

    if (input.value !== numericValue) {
      input.value = numericValue;
      person.controls.birthYear.setValue(numericValue);
    }

    this.handleProfileDraftChange(person, index);
  }

  protected isControlComplete(control: AbstractControl | null): boolean {
    return !!control && control.valid && this.hasValue(control.value);
  }

  protected isControlInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected birthYearDisplay(person: PersonGroup): string {
    return person.controls.birthYear.value.trim() || 'Year';
  }

  protected avatarSrc(person: PersonGroup): string {
    return this.declaration.avatarSrc(person);
  }

  protected avatarAlt(person: PersonGroup): string {
    switch (person.controls.gender.value) {
      case PersonGenderEnum.Female:
        return 'Female family member';
      case PersonGenderEnum.Male:
        return 'Male family member';
      case PersonGenderEnum.Baby:
        return 'Baby family member';
      default:
        return 'Family member';
    }
  }

  protected locationInvalid(): boolean {
    return this.locationInteracted() && !this.hasSelectedZip();
  }

  private initialEditingPersonIndex(): number | null {
    if ((this.selectedLocationId() === null || !this.selectedLocationData()?.zipCode) && this.people.length > 0) {
      return 0;
    }

    const firstIncomplete = this.people.controls.findIndex((person) => person.invalid);
    return firstIncomplete >= 0 ? firstIncomplete : null;
  }

  private clearSelectedLocation(): void {
    this.selectedLocationId.set(null);
    this.selectedLocationData.set(null);
    this.declaration.clearFamilyLocation();
    this.syncPersonBasicsAvailability();
  }

  private syncPersonBasicsAvailability(): void {
    const enabled = this.hasSelectedZip();
    for (const person of this.people.controls) {
      for (const control of [person.controls.gender, person.controls.birthYear]) {
        if (enabled && control.disabled) {
          control.enable({ emitEvent: false });
        } else if (!enabled && control.enabled) {
          control.disable({ emitEvent: false });
          control.markAsUntouched();
          control.markAsPristine();
        }
        control.updateValueAndValidity({ emitEvent: false });
      }
    }
    this.declaration.peopleVersion.update((version) => version + 1);
  }

  private editFirstIncompletePerson(): void {
    const incompleteIndex = this.firstIncompleteIndex();
    const index = incompleteIndex >= 0 ? incompleteIndex : 0;
    this.people.at(index)?.markAllAsTouched();
    this.editingPersonIndex.set(index);
    this.declaration.peopleVersion.update((version) => version + 1);
  }

  private scrollToFirstFamilyInvalid(): void {
    const root = this.host.nativeElement;
    let target: HTMLElement | null = null;

    if (!this.hasSelectedZip()) {
      target = root.querySelector<HTMLElement>('[data-family-validation="location"]');
    }

    if (!target) {
      const incompleteIndex = this.firstIncompleteIndex();
      if (incompleteIndex >= 0) {
        target = root.querySelector<HTMLElement>(`[data-family-person="${incompleteIndex}"]`);
      }
    }

    if (!target) {
      target = root.querySelector<HTMLElement>('[data-family-invalid="true"]');
    }

    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + this.scrollY() - 118;
    this.scrollTo(Math.max(top, 0));
    const control = target.querySelector<HTMLElement>('input, button, [tabindex]');
    control?.focus({ preventScroll: true });
  }

  private scheduleAfterValidationRender(callback: () => void): void {
    this.scheduleFrame(() => this.scheduleFrame(callback));
  }

  private scheduleFrame(callback: () => void): void {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(callback);
      return;
    }

    setTimeout(callback, 0);
  }

  private scrollTo(top: number): void {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
      return;
    }

    window.scrollTo({ top, behavior: 'smooth' });
  }

  private scrollY(): number {
    return typeof window === 'undefined' ? 0 : window.scrollY || window.pageYOffset || 0;
  }

  private canSearchLocations(query: string): boolean {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return false;
    }

    return /^\d+$/.test(trimmedQuery) ? trimmedQuery.length >= 1 : trimmedQuery.length >= 2;
  }

  private locationDisplayValue(location: LocationFilterResponse): string {
    return `${location.zipCode} ${location.locationName}, ${location.cantonName}`;
  }

  private cancelBlurClose(): void {
    if (this.blurCloseTimeoutId === null) {
      return;
    }

    clearTimeout(this.blurCloseTimeoutId);
    this.blurCloseTimeoutId = null;
  }

  private hasValue(value: unknown): boolean {
    return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
  }
}
