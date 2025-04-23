import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Observable, ReplaySubject, of } from 'rxjs';
import {
  switchMap,
  catchError,
  shareReplay,
  startWith,
  takeUntil,
} from 'rxjs/operators';
import { Experience } from '../models/experience.model';
import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class DataTranslationService implements OnDestroy {
  /** Observable emitting translated experience list */
  private experienceList$: Observable<Experience[]>;

  /** Observable emitting translated project list */
  private projectsList$: Observable<Project[]>;

  /** Subject to trigger cleanup on service destruction */
  private destroy$ = new ReplaySubject<void>(1);

  constructor(private translate: TranslateService) {
    // Initialize experience list Observable
    this.experienceList$ = this.translate.onLangChange.pipe(
      startWith({ lang: this.translate.currentLang } as LangChangeEvent),
      switchMap((event: LangChangeEvent) =>
        this.translate.get('EXPERIENCE_LIST').pipe(
          catchError((err) => {
            console.error('Error fetching EXPERIENCE_LIST:', err);
            return of([]);
          })
        )
      ),
      takeUntil(this.destroy$),
      shareReplay(1)
    );

    // Initialize project list Observable
    this.projectsList$ = this.translate.onLangChange.pipe(
      startWith({ lang: this.translate.currentLang } as LangChangeEvent),
      switchMap((event: LangChangeEvent) =>
        this.translate.get('PROJECTS_LIST').pipe(
          catchError((err) => {
            console.error('Error fetching PROJECTS_LIST:', err);
            return of([]);
          })
        )
      ),
      takeUntil(this.destroy$),
      shareReplay(1)
    );
  }

  /**
   * Returns an Observable emitting the translated experience list,
   * updated automatically on language changes.
   */
  getExperienceList(): Observable<Experience[]> {
    return this.experienceList$;
  }

  /**
   * Returns an Observable emitting the translated project list,
   * updated automatically on language changes.
   */
  getProjectsList(): Observable<Project[]> {
    return this.projectsList$;
  }

  /** Cleans up resources on service destruction */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
