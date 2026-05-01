import { TestBed } from '@angular/core/testing';

import { RolGuard } from './rol.guard';

describe('RolGuard', () => {
  let service: RolGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RolGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
