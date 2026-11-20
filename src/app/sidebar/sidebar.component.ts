import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface NavItem {
  label: string;
  href: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  /** URL of the currently active link */
  readonly activeHref = input.required<string>();

  /** Event emitter for navigation link clicks */
  readonly navigate = output<string>();

  /** Array of navigation items */
  readonly navItems: NavItem[] = [
    { label: 'SIDEBAR_ABOUT', href: '#about' },
    { label: 'SIDEBAR_EXPERIENCE', href: '#experience' },
    { label: 'SIDEBAR_PROJECTS', href: '#projects' },
  ];

  /**
   * Handles click events on navigation links, emitting the selected href.
   * The default anchor navigation is cancelled: it would jump to the section
   * instantly, before the parent can scroll to it smoothly.
   * @param item - The navigation item clicked
   * @param event - The DOM click event
   */
  onClick(item: NavItem, event: Event) {
    event.preventDefault();
    this.navigate.emit(item.href);
  }
}
