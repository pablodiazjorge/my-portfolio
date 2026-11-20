import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';

@Component({
  selector: 'app-about',
  imports: [TranslateModule, SafeHtmlPipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {}
