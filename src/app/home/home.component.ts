import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ExperienceComponent } from '../experience/experience.component';
import { AboutComponent } from '../about/about.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { socialComponent } from '../social/social.component';
import { ProjectsComponent } from '../projects/projects.component';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';
import { Subject, fromEvent, takeUntil, debounceTime } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ExperienceComponent,
    ProjectsComponent,
    AboutComponent,
    SidebarComponent,
    socialComponent,
    SafeHtmlPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  /** Reference to the home container element for DOM manipulation */
  @ViewChild('homeContainer', { static: true })
  container!: ElementRef<HTMLElement>;

  /** Currently active section URL fragment */
  activeHref = '#about';

  /** List of section URL fragments for navigation */
  sections = ['#about', '#experience', '#projects'];

  /** Current language (en or es) */
  currentLang: string;

  /** Indicates if dark theme is active */
  isDarkTheme = false;

  /** Subject to manage unsubscription from observables */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private translate: TranslateService,
    //Seo description
    private meta: Meta,
    private titleService: Title,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize language from localStorage or browser settings
    const savedLang = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('language')
      : null;
    this.currentLang =
      savedLang && savedLang.match(/en|es/)
        ? savedLang
        : this.translate.getBrowserLang()?.match(/en|es/)
        ? this.translate.getBrowserLang()!
        : 'en';
    this.translate.use(this.currentLang);

    // Initialize theme from localStorage
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkTheme =
        localStorage.getItem('theme') === 'light' ? false : true; // default to dark if not explicitly 'light'

      document.documentElement.setAttribute(
        'data-theme',
        this.isDarkTheme ? 'dark' : 'light'
      );
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }
  }

  /**
   * Lifecycle hook called after data-bound properties are initialized.
   */
  ngOnInit(): void {
    //Updates meta desc everytime the language changes
    this.updateMetaDescription();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: LangChangeEvent) => {
        this.updateMetaDescription();
      });
    // Check if the code is running in the browser
    if (isPlatformBrowser(this.platformId)) {
      // Create an observable from the window scroll event
      fromEvent(window, 'scroll')
        .pipe(
          // Wait for a specified time after the last scroll event to emit
          debounceTime(100), // Adjust debounce time as needed (milliseconds)
          // Take events until the component is destroyed
          takeUntil(this.destroy$)
        )
        // Subscribe to the debounced scroll events and call removeHoverOnScroll
        .subscribe(() => this.removeHoverOnScroll());
    }
  }

  /**
   * Lifecycle hook called just before the component is destroyed.
   */
  ngOnDestroy(): void {
    // Emit a value to signal that the component is being destroyed
    this.destroy$.next();
    // Complete the subject, unsubscribing all its subscribers
    this.destroy$.complete();
  }

  private updateMetaDescription() {
    const desc = this.translate.instant('HOME_META_DESCRIPTION');
    this.meta.updateTag({ name: 'description', content: desc });
    // Opcional, si quieres título dinámico:
    const title = this.translate.instant('HOME_HEADER_NAME');
    this.titleService.setTitle(title);
  }

  /** Switches between English and Spanish languages */
  switchLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'es' : 'en';
    this.translate.use(this.currentLang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('language', this.currentLang);
    }
  }

  /** Toggles between light and dark theme */
  toggleTheme() {
    // flip our boolean…
    this.isDarkTheme = !this.isDarkTheme;

    if (isPlatformBrowser(this.platformId)) {
      // …and then write the matching data-theme attribute
      document.documentElement.setAttribute(
        'data-theme',
        this.isDarkTheme ? 'dark' : 'light'
      );
      // persist the choice
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }
  }

  /**
   * Removes the 'hovered' class from all project and experience items.
   */
  removeHoverOnScroll() {
    const projects = document.querySelectorAll('.projects-item');
    projects.forEach((project) => {
      project.classList.remove('hovered');
    });
    const experience = document.querySelectorAll('.experience-item');
    experience.forEach((experience) => {
      experience.classList.remove('hovered');
    });
  }

  /**
   * Updates active section based on scroll position
   * @listens window:scroll
   */
  @HostListener('window:scroll')
  onWindowScroll() {
    const activationPoint = window.scrollY + window.innerHeight * 0.5;
    for (let i = this.sections.length - 1; i >= 0; i--) {
      const sel = this.sections[i];
      const sec = document.querySelector<HTMLElement>(sel);
      if (
        sec &&
        sec.getBoundingClientRect().top + window.scrollY <= activationPoint
      ) {
        this.activeHref = sel;
        return;
      }
    }
    this.activeHref = this.sections[0];
  }

  /**
   * Scrolls smoothly to the specified section
   * @param href URL fragment of the target section
   */
  scrollTo(href: string) {
    document
      .querySelector<HTMLElement>(href)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Updates CSS variables based on mouse position within the container
   * @param event Mouse event containing client coordinates
   */
  onMouseMove(event: MouseEvent) {
    const rect = this.container.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update CSS variables
    const el = this.container.nativeElement;
    el.style.setProperty('--cursor-x', `${x}px`);
    el.style.setProperty('--cursor-y', `${y}px`);
  }
}
