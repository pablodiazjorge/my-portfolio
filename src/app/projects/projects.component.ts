import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../models/project.model';
import { DataTranslationService } from '../services/data-translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
})
export class ProjectsComponent implements OnInit, OnDestroy {
  /** Array of projects to display */
  projects: Project[] = [];

  /** Subscription to the project data Observable */
  private dataSubscription: Subscription | undefined;

  constructor(private dataTranslationService: DataTranslationService) {}

  /** Initializes component by subscribing to project data */
  ngOnInit(): void {
    this.dataSubscription = this.dataTranslationService
      .getProjectsList()
      .subscribe({
        next: (data: Project[]) => {
          // Assign received data to projects property
          this.projects = Array.isArray(data) ? data : [];
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
          this.projects = [];
        },
      });
  }

  /** Cleans up subscription to prevent memory leaks */
  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
