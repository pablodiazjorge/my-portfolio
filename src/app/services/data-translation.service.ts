import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Observable, ReplaySubject, of } from 'rxjs';
import { switchMap, catchError, shareReplay, startWith, takeUntil } from 'rxjs/operators';
import { Experience } from '../models/experience.model';
import { Project } from '../models/project.model';

// Fallback data for prerendering
const fallbackExperienceList: Experience[] = [];
const fallbackProjectsList: Project[] = [];

@Injectable({
  providedIn: 'root',
})
export class DataTranslationService implements OnDestroy {
  private experienceList$: Observable<Experience[]>;
  private projectsList$: Observable<Project[]>;
  private destroy$ = new ReplaySubject<void>(1);

  constructor(private translate: TranslateService) {
    this.experienceList$ = this.translate.onLangChange.pipe(
      startWith({ lang: this.translate.currentLang } as LangChangeEvent),
      switchMap((event: LangChangeEvent) =>
        this.translate.get('EXPERIENCE_LIST').pipe(
          catchError((err) => {
            console.error('Error fetching EXPERIENCE_LIST:', err);
            return of(fallbackExperienceList);
          })
        )
      ),
      takeUntil(this.destroy$),
      shareReplay(1)
    );

    this.projectsList$ = this.translate.onLangChange.pipe(
      startWith({ lang: this.translate.currentLang } as LangChangeEvent),
      switchMap((event: LangChangeEvent) =>
        this.translate.get('PROJECTS_LIST').pipe(
          catchError((err) => {
            console.error('Error fetching PROJECTS_LIST:', err);
            return of(fallbackProjectsList);
          })
        )
      ),
      takeUntil(this.destroy$),
      shareReplay(1)
    );
  }

  getExperienceList(): Observable<Experience[]> {
    return this.experienceList$;
  }

  getProjectsList(): Observable<Project[]> {
    return this.projectsList$;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}