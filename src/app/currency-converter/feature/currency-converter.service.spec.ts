import { TestBed } from '@angular/core/testing';
import { CurrencyService } from '../data-access/currency.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('CurrencyConverterService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: CurrencyService,
          useValue: {
            convert: jest.fn(),
            getCurrencies: jest.fn(),

          }
        }
      ]
    });
  })

  test("should be created", () => {
    const service = TestBed.inject(CurrencyService);
    expect(service).toBeTruthy();
  })
});
