import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Experience } from '../models/experience.model';
import { DataTranslationService } from '../services/data-translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.css'],
})
export class ExperienceComponent implements OnInit, OnDestroy {
  /** Array of job experiences to display */
  experience: Experience[] = [];

  /** Subscription to the experience data Observable */
  private dataSubscription: Subscription | undefined;

  constructor(private dataTranslationService: DataTranslationService) {}

  /** Initializes component by subscribing to experience data */
  ngOnInit(): void {
    this.dataSubscription = this.dataTranslationService
      .getExperienceList()
      .subscribe({
        next: (data: Experience[]) => {
          // Assign received data to experience property
          this.experience = Array.isArray(data) ? data : [];
          if (!Array.isArray(data)) {
            console.warn(
              'ExperienceComponent: Received non-array data for experiences:',
              data
            );
          }
        },
        error: (err) => {
          // Handle errors from the service Observable
          console.error(
            'ExperienceComponent: Error fetching experience data:',
            err
          );
          this.experience = [];
        },
      });
  }

  /** Cleans up subscription to prevent memory leaks */
  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
