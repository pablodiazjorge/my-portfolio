import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface NavItem {
  label: string;
  href: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  /** URL of the currently active link */
  @Input() activeHref!: string;

  /** Event emitter for navigation link clicks */
  @Output() navigate = new EventEmitter<string>();

  /** Array of navigation items */
  navItems: NavItem[] = [
    { label: 'SIDEBAR_ABOUT', href: '#about' },
    { label: 'SIDEBAR_EXPERIENCE', href: '#experience' },
    { label: 'SIDEBAR_PROJECTS', href: '#projects' },
  ];

  /**
   * Handles click events on navigation links, emitting the selected href.
   * @param item - The navigation item clicked
   * @param event - The DOM click event
   */
  onClick(item: NavItem, event: Event) {
    event.preventDefault();
    this.navigate.emit(item.href);
  }
}
