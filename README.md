# my-portfolio

Portfolio personal con Angular 22 (standalone y zoneless, con Signals y OnPush), Tailwind CSS 4, prerenderizado con @angular/ssr e i18n ES/EN con ngx-translate.

## Stack

Angular 22 (zoneless + Signals), @angular/ssr, Tailwind CSS 4.1, ngx-translate 16, Express.js (solo en local), PostCSS

## Estructura

Los datos de experiencia y proyectos se sirven desde los archivos de traducción
(`public/assets/i18n/`), lo que permite cambiar contenido sin tocar componentes.
Los componentes son standalone. La aplicación usa un layout de scroll
single-page con navegación por anclas — todas las secciones (About,
Experience, Projects) se renderizan dentro del Home component.

```
src/app/
├── about/           # Sección "Acerca de" — HTML desde i18n con safeHtml
├── experience/      # Lista de experiencia — datos desde EXPERIENCE_LIST en i18n
├── projects/        # Proyectos — datos desde PROJECTS_LIST en i18n
├── home/            # Layout principal, tema, idioma, SEO
├── sidebar/         # Navegación lateral + indicador de sección activa
├── social/          # Enlaces GitHub, LinkedIn
├── models/          # Interfaces Experience y Project
├── services/        # DataTranslationService — reactivo, cacheado con shareReplay
└── pipes/           # SafeHtmlPipe para contenido HTML desde traducciones
```
