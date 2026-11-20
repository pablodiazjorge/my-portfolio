import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { TooltipDirective } from '../directives/tooltip.directive';
import { Project } from '../models/project.model';
import { DataTranslationService } from '../services/data-translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [TranslateModule, TooltipDirective],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
})
export class ProjectsComponent implements OnInit, OnDestroy {
  private dataTranslationService = inject(DataTranslationService);

  /** Array of projects to display */
  readonly projects = signal<Project[]>([]);

  /** Subscription to the project data Observable */
  private dataSubscription: Subscription | undefined;

  /** Initializes component by subscribing to project data */
  ngOnInit(): void {
    this.dataSubscription = this.dataTranslationService
      .getProjectsList()
      .subscribe({
        next: (data: Project[]) => {
          // Assign received data to projects property
          this.projects.set(Array.isArray(data) ? data : []);
          if (!Array.isArray(data)) {
            console.warn(
              'ProjectsComponent: Received non-array data for projects:',
              data
            );
          }
        },
        error: (err) => {
          // Handle errors from the service Observable
          console.error('ProjectsComponent: Error fetching project data:', err);
          this.projects.set([]);
        },
      });
  }

  /** Keeps the same DOM nodes when the list is replaced on language change */
  trackByIndex(index: number): number {
    return index;
  }

  /** Cleans up subscription to prevent memory leaks */
  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
