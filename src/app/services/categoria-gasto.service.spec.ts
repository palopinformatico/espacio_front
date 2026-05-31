import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CategoriaGastoService } from './categoria-gasto.service';

describe('CategoriaGastoService', () => {
  let service: CategoriaGastoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CategoriaGastoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
