import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  DOCUMENT,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ExperienceComponent } from '../experience/experience.component';
import { AboutComponent } from '../about/about.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { socialComponent } from '../social/social.component';
import { ProjectsComponent } from '../projects/projects.component';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';
import { TooltipDirective } from '../directives/tooltip.directive';
import { Subject, takeUntil } from 'rxjs';
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
    TooltipDirective,
  ],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  /**
   * Layer that paints the gradient following the cursor. It is fixed to the
   * window, so the spotlight stays under the pointer even when the page
   * scrolls without the mouse moving. Coordinates are measured against this
   * layer's rectangle, not the container's, which does scroll with the
   * document.
   */
  @ViewChild('spotlight', { static: true })
  spotlight!: ElementRef<HTMLElement>;

  /** Currently active section URL fragment */
  activeHref = '#about';

  /** List of section URL fragments for navigation */
  sections = ['#about', '#experience', '#projects'];

  /** Current language (en or es), derived from the URL by langResolver */
  currentLang: AppLang;

  /** Indicates if dark theme is active */
  isDarkTheme = false;

  /**
   * Whether the visitor has explicitly asked to see motion even though their
   * system has it reduced. The system setting still rules as long as nobody
   * touches this switch: only whoever presses it gets the animation back,
   * and the choice is kept for later visits.
   *
   * Scope: it governs the animated scroll to the sections, which is the only
   * thing this app animates from code. The transitions in the stylesheet
   * still depend on the media query and are not affected.
   */
  motionOverride = false;

  /** True when the system asks for reduced motion */
  systemPrefersReducedMotion = false;

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

      // The motion switch only makes sense when the system asks to reduce
      // motion: otherwise there is nothing to give back and the button is not
      // rendered. The query result is stored so it is not repeated on every
      // scroll.
      this.systemPrefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      this.motionOverride = localStorage.getItem('motion') === 'full';
    }
  }

  /**
   * Turns the motion switch on or off and stores the choice. Turning it off
   * removes the stored flag, so the system rules again instead of pinning a
   * "reduced motion" setting the visitor never asked for.
   */
  toggleMotion() {
    this.motionOverride = !this.motionOverride;
    if (isPlatformBrowser(this.platformId)) {
      if (this.motionOverride) {
        localStorage.setItem('motion', 'full');
      } else {
        localStorage.removeItem('motion');
      }
    }
  }

  /** True when animating is allowed: the system does not ask to reduce, or the switch is on */
  private get motionAllowed(): boolean {
    return !this.systemPrefersReducedMotion || this.motionOverride;
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
  }

  /**
   * Lifecycle hook called just before the component is destroyed.
   */
  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.scrollFrame);
      this.stopScrollListeners?.();
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
   * Updates active section based on scroll position
   * @listens window:scroll
   */
  @HostListener('window:scroll')
  onWindowScroll() {
    // While a scroll animation runs, scrollTo has already set the active
    // section. Recomputing it here on every frame made the sidebar indicator
    // run through the sections in between.
    if (this.ignoreScrollSpy) {
      return;
    }
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
   * Skip link handler: moves keyboard focus to the main content.
   * The anchor's default navigation is cancelled because "#main" resolves
   * against <base href="/"> and would reload the English root page.
   */
  skipToContent(event: Event) {
    event.preventDefault();
    const main = document.getElementById('main');
    if (!main) {
      return;
    }
    main.focus();
    main.scrollIntoView({ block: 'start' });
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

  /** Mutes the active-section tracking while a scroll is running */
  private ignoreScrollSpy = false;

  /**
   * Numbers each scroll, so the deferred release of one does not reach the
   * next when two links are clicked in a row.
   */
  private scrollRun = 0;

  /** Removes the cancel listeners of the running scroll animation, if any */
  private stopScrollListeners: (() => void) | null = null;

  /**
   * Moves the window to `end` along a decelerating curve driven by
   * requestAnimationFrame. Native smooth scrolling (`scroll-behavior` in CSS
   * and `scrollIntoView({ behavior: 'smooth' })`) is deliberately not used:
   * Chrome turns it off entirely when the system has animation effects
   * disabled, and then the sidebar links jump instead of sliding.
   *
   * That is, however, the same condition Chrome reports as
   * `prefers-reduced-motion: reduce`, so what that workaround brought back
   * was exactly the motion the user had asked not to see. That is why the
   * preference is checked first and, when set, the scroll jumps straight to
   * the destination. Whoever wants the animation anyway has the
   * `toggleMotion` switch, which is what `motionAllowed` checks: the system
   * setting rules by default, but it is not a life sentence.
   *
   * <html> carries `scroll-behavior: smooth` (the `scroll-smooth` class in
   * index.html), which would turn every plain window.scrollTo into a native
   * smooth scroll wherever the browser has smooth scrolling on. So
   * each call here forces `behavior: 'instant'`: per frame, so the native
   * animation does not lag behind this one, and in the reduced-motion jump,
   * so the browser does not animate what the user asked not to see.
   *
   * A manual scroll with the wheel, touch or keyboard cancels it. So does
   * pressing the scrollbar, where the browser reports that press (checked in
   * Chrome); where it does not, the animation carries on.
   */
  private animateScrollTo(end: number) {
    cancelAnimationFrame(this.scrollFrame);
    // The previous run's frame is gone, so its cancel listeners must go too.
    this.stopScrollListeners?.();
    const from = window.scrollY;
    const distance = end - from;
    if (Math.abs(distance) < 1) {
      // A second click on the same link during the last frames lands here
      // with the previous run already cancelled above, so nothing else would
      // hand the active-section tracking back.
      this.ignoreScrollSpy = false;
      return;
    }

    // Active-section tracking is muted while the scroll runs and released one
    // frame after it ends: the last window.scrollTo fires its event once the
    // animation has already finished, and that late event would overwrite
    // the indicator again.
    const run = ++this.scrollRun;
    this.ignoreScrollSpy = true;
    const releaseScrollSpy = () =>
      requestAnimationFrame(() => {
        if (run === this.scrollRun) {
          this.ignoreScrollSpy = false;
        }
      });

    if (!this.motionAllowed) {
      window.scrollTo({ top: end, behavior: 'instant' });
      releaseScrollSpy();
      return;
    }

    const duration = Math.min(900, 300 + Math.abs(distance) * 0.2);
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const cancelEvents = ['wheel', 'touchmove', 'keydown'] as const;
    const unbind = () => {
      cancelEvents.forEach((e) => window.removeEventListener(e, cancel));
      window.removeEventListener('pointerdown', onScrollbarPress);
      if (this.stopScrollListeners === unbind) {
        this.stopScrollListeners = null;
      }
    };
    // The user takes over: the animation stops and active-section tracking
    // is handed back at once, not deferred, so the indicator shows where the
    // page really is and not the destination it will no longer reach.
    const cancel = () => {
      cancelAnimationFrame(this.scrollFrame);
      unbind();
      this.ignoreScrollSpy = false;
      // A press on the scrollbar or a key may not scroll at all, so no scroll
      // event would come to correct the indicator, which still shows the
      // destination.
      this.onWindowScroll();
    };
    // Chrome dispatches pointerdown on <html> when the window's scrollbar is
    // pressed, with coordinates past the root's client box. A press inside the
    // page scrolls nothing, so it must not stop the animation. Touch is left
    // out: a tap near the bottom edge can fall past clientHeight on mobile
    // browsers with a collapsing toolbar, and touch scrolling is already
    // caught by touchmove.
    const onScrollbarPress = (e: PointerEvent) => {
      const root = document.documentElement;
      if (
        e.pointerType === 'mouse' &&
        (e.clientX >= root.clientWidth || e.clientY >= root.clientHeight)
      ) {
        cancel();
      }
    };
    cancelEvents.forEach((e) => window.addEventListener(e, cancel, { passive: true }));
    window.addEventListener('pointerdown', onScrollbarPress, { passive: true });

    this.stopScrollListeners = unbind;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: from + distance * easeOut(t), behavior: 'instant' });
      if (t < 1) {
        this.scrollFrame = requestAnimationFrame(step);
      } else {
        unbind();
        releaseScrollSpy();
      }
    };
    this.scrollFrame = requestAnimationFrame(step);
  }

  /**
   * Updates CSS variables based on mouse position within the gradient layer
   * @param event Mouse event containing client coordinates
   */
  onMouseMove(event: MouseEvent) {
    // The rectangle is the gradient layer's own, since that layer reads both
    // variables. Being fixed to the window, the rectangle starts at its
    // corner, so the coordinates match the pointer's.
    const el = this.spotlight.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update CSS variables
    el.style.setProperty('--cursor-x', `${x}px`);
    el.style.setProperty('--cursor-y', `${y}px`);
  }
}
