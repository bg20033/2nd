import { inject } from '@angular/core';
import { Router, Routes, type CanActivateFn } from '@angular/router';

import { HealthDeclarationFormService } from './services/health-declaration-form.service';

const familySetupGuard: CanActivateFn = () => {
  const declaration = inject(HealthDeclarationFormService);
  const router = inject(Router);

  return declaration.familySetupValid() ? true : router.parseUrl('/family');
};

const questionsRedirectGuard: CanActivateFn = () => {
  const declaration = inject(HealthDeclarationFormService);
  const router = inject(Router);

  if (!declaration.familySetupValid()) {
    return router.parseUrl('/family');
  }

  const lastIndex = Math.max(declaration.peopleArray.length - 1, 0);
  const index = Math.min(Math.max(declaration.currentPersonIndex(), 0), lastIndex);
  return router.parseUrl(`/questions/person/${index}`);
};

const personRouteGuard: CanActivateFn = (route) => {
  const declaration = inject(HealthDeclarationFormService);
  const router = inject(Router);
  const rawIndex = route.paramMap.get('index');
  const index = Number(rawIndex);
  const lastIndex = declaration.peopleArray.length - 1;

  if (!declaration.familySetupValid()) {
    return router.parseUrl('/family');
  }

  if (!Number.isInteger(index) || index < 0 || index > lastIndex) {
    return router.parseUrl(`/questions/person/${Math.max(Math.min(declaration.currentPersonIndex(), lastIndex), 0)}`);
  }

  if (!declaration.canVisitPerson(index)) {
    return router.parseUrl(`/questions/person/${declaration.highestReachedPersonIndex()}`);
  }

  return true;
};

const reviewGuard: CanActivateFn = () => {
  const declaration = inject(HealthDeclarationFormService);
  const router = inject(Router);

  if (declaration.allPeopleCompleted()) {
    return true;
  }

  if (!declaration.familySetupValid()) {
    return router.parseUrl('/family');
  }

  return router.parseUrl(`/questions/person/${declaration.currentPersonIndex()}`);
};

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'landing' },
  {
    path: 'landing',
    loadComponent: () => import('./components/pages/app-landing/app-landing').then((component) => component.AppLanding),
  },
  {
    path: 'family',
    loadComponent: () => import('./components/pages/family-config/family-config').then((component) => component.FamilyConfig),
  },
  {
    path: 'questions',
    loadComponent: () =>
      import('./components/pages/questions/page/questionnaire-form.component').then((component) => component.QuestionnaireFormComponent),
    canActivate: [questionsRedirectGuard],
  },
  {
    path: 'questions/person/:index',
    loadComponent: () =>
      import('./components/pages/questions/page/questionnaire-form.component').then((component) => component.QuestionnaireFormComponent),
    canActivate: [familySetupGuard, personRouteGuard],
  },
  {
    path: 'review',
    loadComponent: () =>
      import('./components/pages/questions/page/questionnaire-form.component').then((component) => component.QuestionnaireFormComponent),
    canActivate: [reviewGuard],
  },
  { path: '**', redirectTo: 'landing' },
];
