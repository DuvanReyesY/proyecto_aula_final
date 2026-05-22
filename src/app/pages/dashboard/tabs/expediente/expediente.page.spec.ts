import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpedientePage } from './expediente.page';

describe('ExpedientePage', () => {
  let component: ExpedientePage;
  let fixture: ComponentFixture<ExpedientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpedientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
