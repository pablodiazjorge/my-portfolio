import { Routes } from '@angular/router';
import { ProjectsComponent } from './projects/projects.component';
import { HomeComponent } from './home/home.component';
import { ExperienceComponent } from './experience/experience.component';

export const routes: Routes = [
    { path: '', component: HomeComponent }, // Default route (Home)
    { path: '**', redirectTo: '' } // Redirect any unknown route to home
];