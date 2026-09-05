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
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ExperienceComponent } from '../experience/experience.component';
import { AboutComponent } from '../about/about.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { socialComponent } from '../social/social.component';
import { ProjectsComponent } from '../projects/projects.component';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';
import { Subject, fromEvent, takeUntil, debounceTime } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { AppLang, DEFAULT_LANG, pathForLang, rememberLang, urlForLang } from '../i18n/lang';

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

  /** Current language (en or es), derived from the URL by langResolver */
  currentLang: AppLang;

  /** Indicates if dark theme is active */
  isDarkTheme = false;

  /** Subject to manage unsubscription from observables */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private translate: TranslateService,
    //Seo description
    private meta: Meta,
    private titleService: Title,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Translations for the URL's language were loaded by langResolver before
    // this component was created, on the server and in the browser alike.
    this.currentLang = (this.translate.currentLang as AppLang) || DEFAULT_LANG;
    this.applyLangToDocument();

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
    // Keep <html lang>, meta tags and hreflang links in sync with the language.
    // The component is reused across `/` and `/es` (see app.config.ts), so
    // language switches arrive here as onLangChange events from the resolver.
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: LangChangeEvent) => {
        this.currentLang = event.lang as AppLang;
        this.applyLangToDocument();
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
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.scrollFrame);
    }
    // Emit a value to signal that the component is being destroyed
    this.destroy$.next();
    // Complete the subject, unsubscribing all its subscribers
    this.destroy$.complete();
  }

  /**
   * Writes everything language-dependent outside the template: <html lang>,
   * title, meta description and the canonical / hreflang links. Runs on the
   * server too, so each prerendered HTML file carries its own SEO tags.
   */
  private applyLangToDocument() {
    const lang = this.currentLang;
    this.document.documentElement.lang = lang;
    this.titleService.setTitle(this.translate.instant('HOME_HEADER_NAME'));
    this.meta.updateTag({
      name: 'description',
      content: this.translate.instant('HOME_META_DESCRIPTION'),
    });

    const head = this.document.head;
    head.querySelectorAll('link[data-lang-seo]').forEach((el) => el.remove());
    const links: Record<string, string>[] = [
      { rel: 'canonical', href: urlForLang(lang) },
      { rel: 'alternate', hreflang: 'en', href: urlForLang('en') },
      { rel: 'alternate', hreflang: 'es', href: urlForLang('es') },
      { rel: 'alternate', hreflang: 'x-default', href: urlForLang(DEFAULT_LANG) },
    ];
    for (const attrs of links) {
      const link = this.document.createElement('link');
      Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
      link.setAttribute('data-lang-seo', '');
      head.appendChild(link);
    }
  }

  /**
   * Switches between English and Spanish by navigating to the other
   * language's URL. The choice is stored in a cookie so the edge redirect
   * serves the right language directly on the next visit.
   */
  switchLanguage() {
    const next: AppLang = this.currentLang === 'en' ? 'es' : 'en';
    if (isPlatformBrowser(this.platformId)) {
      rememberLang(this.document, next);
    }
    this.router.navigateByUrl(pathForLang(next));
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
    const target = document.querySelector<HTMLElement>(href);
    if (!target) {
      return;
    }
    // Honour the section's scroll-margin-top, like scrollIntoView would
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const end = Math.max(0, Math.min(target.getBoundingClientRect().top + window.scrollY - margin, maxY));
    this.animateScrollTo(end);
    // Keep the section in the URL without triggering the browser's own jump.
    // The path is kept explicitly: a bare "#id" would resolve against
    // <base href="/"> and drop the /es prefix.
    history.replaceState(history.state, '', location.pathname + location.search + href);
    this.activeHref = href;
  }

  /** Handle of the running scroll animation frame, if any */
  private scrollFrame = 0;

  /**
   * Scrolls the window to `end` with an ease-out curve driven by
   * requestAnimationFrame. Native smooth scrolling (CSS `scroll-behavior`
   * and `scrollIntoView({ behavior: 'smooth' })`) is not used on purpose:
   * Chrome disables it entirely when the OS has animation effects turned
   * off, which made the sidebar links jump instead of glide.
   * A manual wheel, touch or keyboard scroll cancels the animation.
   */
  private animateScrollTo(end: number) {
    cancelAnimationFrame(this.scrollFrame);
    const from = window.scrollY;
    const distance = end - from;
    if (Math.abs(distance) < 1) {
      return;
    }
    const duration = Math.min(900, 300 + Math.abs(distance) * 0.2);
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const cancelEvents = ['wheel', 'touchmove', 'keydown'] as const;
    const cancel = () => {
      cancelAnimationFrame(this.scrollFrame);
      cancelEvents.forEach((e) => window.removeEventListener(e, cancel));
    };
    cancelEvents.forEach((e) => window.addEventListener(e, cancel, { passive: true }));

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + distance * easeOut(t));
      if (t < 1) {
        this.scrollFrame = requestAnimationFrame(step);
      } else {
        cancel();
      }
    };
    this.scrollFrame = requestAnimationFrame(step);
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
