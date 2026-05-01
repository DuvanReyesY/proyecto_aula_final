import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterMascotaPage } from './register-mascota.page';

describe('RegisterMascotaPage', () => {
  let component: RegisterMascotaPage;
  let fixture: ComponentFixture<RegisterMascotaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterMascotaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
