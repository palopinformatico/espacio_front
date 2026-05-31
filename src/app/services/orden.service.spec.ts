import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { OrdenService } from './orden.service';

describe('OrdenService', () => {
  let service: OrdenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(OrdenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
