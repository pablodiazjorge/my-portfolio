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

/** Numera los rótulos para poder enlazarlos con `aria-describedby`. */
let contador = 0;

/**
 * Rótulo de ayuda para un control sin texto a la vista, en lugar del atributo
 * `title`. El del navegador no se puede recorrer con el puntero ni descartar
 * con Escape, que es lo que pide WCAG 1.4.13, tarda casi un segundo en salir y
 * no se parece al resto de la interfaz.
 *
 * El rótulo se cuelga del `body` y no del control, porque varios de los que lo
 * usan viven dentro de contenedores con `overflow: hidden` que lo recortarían.
 * A cambio, el puntero sale del control al ir hacia él, así que el cierre se
 * aplaza y el propio rótulo lo cancela: de ahí que se pueda recorrer.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  /**
   * Texto del rótulo. Si llega vacío, no se pinta nada. Si cambia con el
   * rótulo abierto, se actualiza en el sitio: los botones de tema, idioma y
   * movimiento cambian de texto justo al pulsarlos, con el puntero encima.
   */
  @Input('appTooltip')
  set text(valor: string) {
    this.texto = valor ?? '';
    if (!this.tip) {
      return;
    }
    if (!this.texto) {
      this.quitar();
      return;
    }
    this.renderer.setProperty(this.tip, 'textContent', this.texto);
    this.enlazar();
    this.colocar();
  }
  get text(): string {
    return this.texto;
  }

  /** La instancia que tiene el rótulo abierto, si hay alguna. */
  private static abierto?: TooltipDirective;

  private texto = '';
  private tip?: HTMLElement;
  /** Deja de escuchar el desplazamiento y el cambio de tamaño de la ventana. */
  private soltar: Array<() => void> = [];
  private abrir?: ReturnType<typeof setTimeout>;
  private cerrar?: ReturnType<typeof setTimeout>;
  private readonly id = `tooltip-${++contador}`;

  constructor(
    private host: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnDestroy(): void {
    this.quitar();
  }

  // Con el puntero, un retardo corto evita que el rótulo parpadee al cruzar
  // por encima de camino a otra cosa. Atlassian sitúa una interacción entre
  // 50 y 150 ms, así que se queda en el techo de ese intervalo.
  @HostListener('mouseenter')
  alEntrarElPuntero(): void {
    this.programarApertura(150);
  }

  @HostListener('mouseleave')
  alSalirElPuntero(): void {
    this.programarCierre();
  }

  // Por teclado sale sin retardo: quien tabula ya ha decidido llegar aquí.
  @HostListener('focus')
  alEnfocar(): void {
    this.programarApertura(0);
  }

  @HostListener('blur')
  alDesenfocar(): void {
    this.quitar();
  }

  /** Escape lo descarta sin mover el foco, como pide WCAG 1.4.13. */
  @HostListener('keydown.escape', ['$event'])
  alPulsarEscape(evento: Event): void {
    if (this.tip) {
      evento.stopPropagation();
      this.quitar();
    }
  }

  private programarApertura(retardo: number): void {
    if (!isPlatformBrowser(this.platformId) || !this.text) {
      return;
    }
    clearTimeout(this.cerrar);
    if (this.tip) {
      return;
    }
    clearTimeout(this.abrir);
    this.abrir = setTimeout(() => this.pintar(), retardo);
  }

  /**
   * El cierre se aplaza lo justo para que el puntero pueda cruzar el hueco
   * entre el control y el rótulo. Si llega, el `mouseenter` del propio rótulo
   * cancela este temporizador.
   */
  private programarCierre(): void {
    clearTimeout(this.abrir);
    clearTimeout(this.cerrar);
    this.cerrar = setTimeout(() => this.quitar(), 120);
  }

  private pintar(): void {
    // Solo uno a la vez: si el puntero va de un control a otro, el de salida
    // todavía está esperando su cierre aplazado. Lo cierra su dueño, para que
    // suelte también sus escuchas y su `aria-describedby`.
    if (TooltipDirective.abierto !== this) {
      TooltipDirective.abierto?.quitar();
    }
    TooltipDirective.abierto = this;

    const tip = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(tip, 'id', this.id);
    this.renderer.setAttribute(tip, 'role', 'tooltip');
    this.renderer.addClass(tip, 'app-tooltip');
    this.renderer.setProperty(tip, 'textContent', this.text);
    this.renderer.appendChild(this.document.body, tip);

    // El rótulo recibe el puntero para poder recorrerlo, y mientras esté
    // debajo no se cierra.
    this.renderer.listen(tip, 'mouseenter', () => clearTimeout(this.cerrar));
    this.renderer.listen(tip, 'mouseleave', () => this.programarCierre());

    // El rótulo va fijo a la ventana y el control puede moverse con la página
    // (al tabular hasta uno que queda fuera, el navegador lo trae a la vista),
    // así que se recoloca en vez de quedarse señalando a un sitio vacío.
    this.soltar = [
      this.renderer.listen('window', 'scroll', () => this.colocar()),
      this.renderer.listen('window', 'resize', () => this.colocar()),
      // Escape también lo descarta cuando lo abrió el puntero y el foco está
      // en otra parte: ahí la tecla no pasa por el control.
      this.renderer.listen('document', 'keydown', (evento: KeyboardEvent) => {
        if (evento.key === 'Escape') {
          this.quitar();
        }
      }),
    ];

    this.tip = tip;
    this.colocar();
    this.enlazar();
    // Se enciende en el fotograma siguiente para que la transición tenga de
    // dónde salir.
    requestAnimationFrame(() => this.renderer.addClass(tip, 'visible'));
  }

  /**
   * Debajo del control y centrado; arriba cuando no cabe debajo. El rótulo se
   * mantiene dentro de la ventana con un margen de 8 px a cada lado.
   */
  private colocar(): void {
    const tip = this.tip;
    if (!tip) {
      return;
    }
    const control = this.host.nativeElement.getBoundingClientRect();
    const caja = tip.getBoundingClientRect();
    // Separación entre el control y el rótulo: la flecha asoma 7 px en ella.
    const hueco = 10;
    // El ancho útil no cuenta la barra de desplazamiento; innerWidth sí, y
    // con él el rótulo de los botones de la esquina quedaba debajo de ella.
    const ancho = this.document.documentElement.clientWidth;

    const cabeDebajo = control.bottom + hueco + caja.height <= window.innerHeight;
    const top = cabeDebajo
      ? control.bottom + hueco
      : control.top - hueco - caja.height;

    const centrado = control.left + control.width / 2 - caja.width / 2;
    // Si el rótulo no cabe a lo ancho, manda el margen izquierdo: el texto
    // empieza por ahí.
    const margenLateral = 8;
    const left = Math.max(
      margenLateral,
      Math.min(centrado, ancho - caja.width - margenLateral)
    );

    const izquierda = Math.round(left);
    this.renderer.setStyle(tip, 'top', `${Math.round(top)}px`);
    this.renderer.setStyle(tip, 'left', `${izquierda}px`);

    // La flecha apunta al centro del control y no al del rótulo, que deja de
    // coincidir cuando el rótulo se arrima al borde de la ventana. Se mide
    // desde el interior del borde, que es desde donde se coloca el
    // pseudoelemento, y no se acerca a las esquinas redondeadas.
    const margen = 12;
    const centro = control.left + control.width / 2 - izquierda - tip.clientLeft;
    const flecha = Math.min(
      Math.max(margen, centro),
      tip.clientWidth - margen
    );
    tip.style.setProperty('--flecha-x', `${Math.round(flecha)}px`);
    this.renderer.removeClass(tip, cabeDebajo ? 'encima' : 'debajo');
    this.renderer.addClass(tip, cabeDebajo ? 'debajo' : 'encima');
  }

  /**
   * El rótulo es la forma corta y visible del nombre accesible del control.
   * Solo se enlaza como descripción cuando dice algo que el nombre no dice:
   * si no, un lector de pantalla leería lo mismo dos veces.
   */
  private enlazar(): void {
    const control = this.host.nativeElement;
    const nombre = control.getAttribute('aria-label') ?? control.textContent ?? '';
    const repetido = nombre
      .toLocaleLowerCase()
      .includes(this.texto.toLocaleLowerCase());
    if (repetido) {
      this.renderer.removeAttribute(control, 'aria-describedby');
    } else {
      this.renderer.setAttribute(control, 'aria-describedby', this.id);
    }
  }

  private quitar(): void {
    clearTimeout(this.abrir);
    clearTimeout(this.cerrar);
    this.soltar.forEach((dejarDeEscuchar) => dejarDeEscuchar());
    this.soltar = [];
    if (TooltipDirective.abierto === this) {
      TooltipDirective.abierto = undefined;
    }
    if (this.tip) {
      this.renderer.removeChild(this.document.body, this.tip);
      this.tip = undefined;
    }
    this.renderer.removeAttribute(this.host.nativeElement, 'aria-describedby');
  }
}
