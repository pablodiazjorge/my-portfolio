import { ComponentFixture, TestBed } from '@angular/core/testing';
import { socialComponent } from './social.component';


describe('socialComponent', () => {
  let component: socialComponent;
  let fixture: ComponentFixture<socialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [socialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(socialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
