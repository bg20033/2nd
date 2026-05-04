import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LocationFilterResponse {
  locationId: number;
  zipCode: string;
  locationName: string;
  cantonName: string;
}

type OpenPlzCanton = {
  shortName?: string;
  name?: string;
};

type OpenPlzLocality = {
  key?: string | number;
  postalCode?: string;
  name?: string;
  canton?: OpenPlzCanton | null;
};

type OpenPlzResponse = OpenPlzLocality[] | { results?: OpenPlzLocality[] };

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly http = inject(HttpClient);

  searchLocations(query: string): Observable<LocationFilterResponse[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return of([]);
    }

    const isNumeric = /^\d+$/.test(trimmedQuery);
    const searchParam = isNumeric
      ? `postalCode=${encodeURIComponent(`^${trimmedQuery}`)}`
      : `name=${encodeURIComponent(trimmedQuery)}`;

    return this.http
      .get<OpenPlzResponse>(`https://openplzapi.org/ch/Localities?${searchParam}&pageSize=20`)
      .pipe(
        map((response) => {
          const localities = Array.isArray(response) ? response : response.results ?? [];
          const mapped: LocationFilterResponse[] = localities
            .map((locality) => {
              const zipCode = locality.postalCode ?? '';
              const locationName = locality.name ?? '';
              if (!zipCode || !locationName) {
                return null;
              }

              return {
                locationId: Number(locality.key) || 0,
                zipCode,
                locationName,
                cantonName: locality.canton?.shortName || locality.canton?.name || '',
              };
            })
            .filter((entry): entry is LocationFilterResponse => entry !== null);

          return isNumeric
            ? mapped.filter((location) => location.zipCode.startsWith(trimmedQuery))
            : mapped;
        }),
        catchError(() => of([])),
      );
  }
}
