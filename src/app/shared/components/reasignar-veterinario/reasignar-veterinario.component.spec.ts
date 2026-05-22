import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ReasignarVeterinarioComponent } from './reasignar-veterinario.component';

describe('ReasignarVeterinarioComponent', () => {
  let component: ReasignarVeterinarioComponent;
  let fixture: ComponentFixture<ReasignarVeterinarioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ReasignarVeterinarioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ReasignarVeterinarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
