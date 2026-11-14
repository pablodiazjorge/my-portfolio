import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/** Numbers the tooltips so they can be linked through `aria-describedby`. */
let tooltipCount = 0;

/**
 * Tooltip for a control with no visible text, used instead of the `title`
 * attribute. The browser's one cannot be hovered with the pointer or dismissed
 * with Escape, which is what WCAG 1.4.13 asks for, takes almost a second to
 * appear and does not look like the rest of the interface.
 *
 * The tooltip is attached to `body` and not to the control, because several
 * of the controls that use it live inside containers with `overflow: hidden`
 * that would clip it. In exchange, the pointer leaves the control on its way
 * to the tooltip, so closing is deferred and the tooltip itself cancels it:
 * that is what makes it hoverable.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  /**
   * Tooltip text. If it arrives empty, nothing is shown. If it changes while
   * the tooltip is open, it is updated in place: the theme, language and
   * motion buttons change their text right when pressed, with the pointer
   * still over them.
   */
  @Input('appTooltip')
  set text(value: string) {
    this.tooltipText = value ?? '';
    if (!this.tip) {
      return;
    }
    if (!this.tooltipText) {
      this.hide();
      return;
    }
    this.renderer.setProperty(this.tip, 'textContent', this.tooltipText);
    this.updateDescribedBy();
    this.position();
  }
  get text(): string {
    return this.tooltipText;
  }

  /** The instance whose tooltip is open, if any. */
  private static openInstance?: TooltipDirective;

  private tooltipText = '';
  private tip?: HTMLElement;
  /** Stops listening to window scroll and resize. */
  private unlisteners: Array<() => void> = [];
  private openTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private readonly id = `tooltip-${++tooltipCount}`;

  constructor(
    private host: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnDestroy(): void {
    this.hide();
  }

  // With the pointer, a short delay keeps the tooltip from flickering when
  // the pointer crosses over on its way to something else. Atlassian puts an
  // interaction between 50 and 150 ms, so it stays at the top of that range.
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.scheduleOpen(150);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.scheduleClose();
  }

  // From the keyboard it shows with no delay: whoever tabs here has already
  // decided to come.
  @HostListener('focus')
  onFocus(): void {
    this.scheduleOpen(0);
  }

  @HostListener('blur')
  onBlur(): void {
    this.hide();
  }

  /** Escape dismisses it without moving focus, as WCAG 1.4.13 asks. */
  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.tip) {
      event.stopPropagation();
      this.hide();
    }
  }

  private scheduleOpen(delay: number): void {
    if (!isPlatformBrowser(this.platformId) || !this.text) {
      return;
    }
    clearTimeout(this.closeTimer);
    if (this.tip) {
      return;
    }
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => this.show(), delay);
  }

  /**
   * Closing is deferred just long enough for the pointer to cross the gap
   * between the control and the tooltip. If it gets there, the tooltip's own
   * `mouseenter` cancels this timer.
   */
  private scheduleClose(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.hide(), 120);
  }

  private show(): void {
    // Only one at a time: if the pointer moves from one control to another,
    // the one it left is still waiting for its deferred close. Its owner
    // closes it, so it also drops its listeners and its `aria-describedby`.
    if (TooltipDirective.openInstance !== this) {
      TooltipDirective.openInstance?.hide();
    }
    TooltipDirective.openInstance = this;

    const tip = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(tip, 'id', this.id);
    this.renderer.setAttribute(tip, 'role', 'tooltip');
    this.renderer.addClass(tip, 'app-tooltip');
    this.renderer.setProperty(tip, 'textContent', this.text);
    this.renderer.appendChild(this.document.body, tip);

    // The tooltip receives the pointer so it can be hovered, and it does not
    // close while the pointer is over it.
    this.renderer.listen(tip, 'mouseenter', () => clearTimeout(this.closeTimer));
    this.renderer.listen(tip, 'mouseleave', () => this.scheduleClose());

    // The tooltip is fixed to the window and the control can move with the
    // page (when tabbing to one that is out of view, the browser brings it
    // into view), so it is repositioned instead of pointing at an empty spot.
    this.unlisteners = [
      this.renderer.listen('window', 'scroll', () => this.position()),
      this.renderer.listen('window', 'resize', () => this.position()),
      // Escape also dismisses it when the pointer opened it and focus is
      // elsewhere: in that case the key does not go through the control.
      this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.hide();
        }
      }),
    ];

    this.tip = tip;
    this.position();
    this.updateDescribedBy();
    // It is switched on in the next frame so the transition has a starting
    // point.
    requestAnimationFrame(() => this.renderer.addClass(tip, 'visible'));
  }

  /**
   * Below the control and centred; above it when it does not fit below. The
   * tooltip is kept inside the window with an 8 px margin on each side.
   */
  private position(): void {
    const tip = this.tip;
    if (!tip) {
      return;
    }
    const control = this.host.nativeElement.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    // Gap between the control and the tooltip: the arrow sticks out 7 px into it.
    const gap = 10;
    // The usable width leaves out the scrollbar; innerWidth includes it, and
    // with it the tooltip of the corner buttons ended up under the scrollbar.
    const viewportWidth = this.document.documentElement.clientWidth;

    const fitsBelow = control.bottom + gap + tipRect.height <= window.innerHeight;
    const top = fitsBelow
      ? control.bottom + gap
      : control.top - gap - tipRect.height;

    const centred = control.left + control.width / 2 - tipRect.width / 2;
    // If the tooltip does not fit across, the left margin wins: the text
    // starts there.
    const sideMargin = 8;
    const left = Math.max(
      sideMargin,
      Math.min(centred, viewportWidth - tipRect.width - sideMargin)
    );

    const roundedLeft = Math.round(left);
    this.renderer.setStyle(tip, 'top', `${Math.round(top)}px`);
    this.renderer.setStyle(tip, 'left', `${roundedLeft}px`);

    // The arrow points at the centre of the control and not at the centre of
    // the tooltip, which stop matching when the tooltip is pushed against the
    // window edge. It is measured from inside the border, which is where the
    // pseudo-element is positioned from, and it keeps clear of the rounded
    // corners.
    const arrowInset = 12;
    const controlCentre =
      control.left + control.width / 2 - roundedLeft - tip.clientLeft;
    const arrowX = Math.min(
      Math.max(arrowInset, controlCentre),
      tip.clientWidth - arrowInset
    );
    tip.style.setProperty('--arrow-x', `${Math.round(arrowX)}px`);
    this.renderer.removeClass(tip, fitsBelow ? 'above' : 'below');
    this.renderer.addClass(tip, fitsBelow ? 'below' : 'above');
  }

  /**
   * The tooltip is the short, visible form of the control's accessible name.
   * It is only linked as a description when it says something the name does
   * not: otherwise a screen reader would read the same thing twice.
   */
  private updateDescribedBy(): void {
    const control = this.host.nativeElement;
    const name = control.getAttribute('aria-label') ?? control.textContent ?? '';
    const isRepeated = name
      .toLocaleLowerCase()
      .includes(this.tooltipText.toLocaleLowerCase());
    if (isRepeated) {
      this.renderer.removeAttribute(control, 'aria-describedby');
    } else {
      this.renderer.setAttribute(control, 'aria-describedby', this.id);
    }
  }

  private hide(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.unlisteners.forEach((unlisten) => unlisten());
    this.unlisteners = [];
    if (TooltipDirective.openInstance === this) {
      TooltipDirective.openInstance = undefined;
    }
    if (this.tip) {
      this.renderer.removeChild(this.document.body, this.tip);
      this.tip = undefined;
    }
    this.renderer.removeAttribute(this.host.nativeElement, 'aria-describedby');
  }
}
