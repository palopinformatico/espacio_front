import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { HorariosService } from './horarios.service';

describe('HorariosService', () => {
  let service: HorariosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(HorariosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
