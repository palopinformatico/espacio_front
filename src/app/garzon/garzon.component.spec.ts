import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { GarzonComponent } from './garzon.component';

describe('GarzonComponent', () => {
  let component: GarzonComponent;
  let fixture: ComponentFixture<GarzonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, GarzonComponent],
      providers: [provideMockStore({ initialState: {} })]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GarzonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
