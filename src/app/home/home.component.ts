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
  /**
   * Capa que pinta el degradado que sigue al cursor. Va fija a la ventana, así
   * que el foco se queda bajo el puntero aunque la página se desplace sin que
   * el ratón se mueva. Las coordenadas se miden contra el rectángulo de esta
   * capa, no contra el del contenedor, que sí se desplaza con el documento.
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
   * Si el visitante ha pedido explícitamente ver el movimiento aunque su
   * sistema lo tenga reducido. El ajuste del sistema sigue mandando mientras
   * nadie toque este interruptor: solo quien lo pulsa recupera la animación,
   * y la elección se guarda para las siguientes visitas.
   *
   * Alcance: gobierna el desplazamiento animado a las secciones, que es lo
   * único que esta aplicación anima desde el código. Las transiciones que
   * están en la hoja de estilos siguen colgando de la consulta de medios y no
   * se ven afectadas.
   */
  motionOverride = false;

  /** Verdadero cuando el sistema pide reducir el movimiento */
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

      // El interruptor de movimiento solo tiene sentido cuando el sistema pide
      // reducirlo: si no lo pide, no hay nada que devolver y el botón no se
      // pinta. La consulta se guarda para no repetirla en cada desplazamiento.
      this.systemPrefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      this.motionOverride = localStorage.getItem('motion') === 'full';
    }
  }

  /**
   * Enciende o apaga el interruptor de movimiento y guarda la elección. Al
   * apagarlo se borra la marca, de modo que vuelve a mandar el sistema en vez
   * de quedar fijado un «movimiento reducido» que el visitante no pidió.
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

  /** Verdadero cuando toca animar: o el sistema no pide reducir, o hay interruptor */
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
    // Mientras corre una animación de desplazamiento, la sección activa ya la
    // ha fijado scrollTo. Recalcularla aquí en cada fotograma hacía que el
    // indicador de la barra lateral recorriese las secciones intermedias.
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

  /** Silencia el cálculo de la sección activa mientras dura un desplazamiento */
  private ignoreScrollSpy = false;

  /**
   * Numera cada desplazamiento, para que la liberación aplazada de uno no
   * alcance al siguiente cuando se pulsan dos enlaces seguidos.
   */
  private scrollRun = 0;

  /**
   * Lleva la ventana hasta `end` con una curva de desaceleración movida por
   * requestAnimationFrame. El desplazamiento nativo (`scroll-behavior` en CSS
   * y `scrollIntoView({ behavior: 'smooth' })`) no se usa a propósito: Chrome
   * lo desactiva por completo cuando el sistema tiene los efectos de animación
   * apagados, y entonces los enlaces de la barra lateral saltan en vez de
   * deslizarse.
   *
   * Esa es, sin embargo, la misma condición que Chrome comunica como
   * `prefers-reduced-motion: reduce`, así que lo que aquel apaño devolvía era
   * justo el movimiento que el usuario había pedido no ver. Por eso la
   * preferencia se mira primero y, si está puesta, se salta al destino de una
   * vez. Quien quiera la animación de todos modos tiene el interruptor de
   * `toggleMotion`, que es lo que `motionAllowed` consulta: el ajuste del
   * sistema manda por defecto, pero no es una condena.
   *
   * Un desplazamiento manual con la rueda, el tacto o el teclado la cancela.
   */
  private animateScrollTo(end: number) {
    cancelAnimationFrame(this.scrollFrame);
    const from = window.scrollY;
    const distance = end - from;
    if (Math.abs(distance) < 1) {
      return;
    }

    // Se silencia el cálculo de la sección activa mientras el desplazamiento
    // esté en marcha, y se libera un fotograma después de terminarlo: el
    // último window.scrollTo emite su evento cuando la animación ya ha
    // acabado, y ese evento rezagado volvería a sobrescribir el indicador.
    const run = ++this.scrollRun;
    this.ignoreScrollSpy = true;
    const releaseScrollSpy = () =>
      requestAnimationFrame(() => {
        if (run === this.scrollRun) {
          this.ignoreScrollSpy = false;
        }
      });

    if (!this.motionAllowed) {
      window.scrollTo(0, end);
      releaseScrollSpy();
      return;
    }

    const duration = Math.min(900, 300 + Math.abs(distance) * 0.2);
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const cancelEvents = ['wheel', 'touchmove', 'keydown'] as const;
    const unbind = () =>
      cancelEvents.forEach((e) => window.removeEventListener(e, cancel));
    // El usuario toma el mando: se corta la animación y se devuelve el cálculo
    // de la sección activa en el acto, sin aplazarlo, para que el indicador
    // marque dónde está de verdad y no el destino al que ya no va a llegar.
    const cancel = () => {
      cancelAnimationFrame(this.scrollFrame);
      unbind();
      this.ignoreScrollSpy = false;
    };
    cancelEvents.forEach((e) => window.addEventListener(e, cancel, { passive: true }));

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + distance * easeOut(t));
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
    // El rectángulo es el de la propia capa del degradado, que es la que lee
    // las dos variables. Al ir fija a la ventana, ese rectángulo empieza en su
    // esquina, de modo que las coordenadas coinciden con las del puntero.
    const el = this.spotlight.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update CSS variables
    el.style.setProperty('--cursor-x', `${x}px`);
    el.style.setProperty('--cursor-y', `${y}px`);
  }
}
