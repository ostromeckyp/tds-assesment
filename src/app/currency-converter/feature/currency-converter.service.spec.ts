import { TestBed } from '@angular/core/testing';
import { CurrencyService } from '../data-access/currency.service';
import { provideZonelessChangeDetection } from '@angular/core';
import { delay, of, switchMap } from 'rxjs';
import { CurrencyConverterService } from './currency-converter.service';
import { ConversionResponse } from '../data-access/currency.model';


describe('CurrencyConverterService', () => {
  let currencyService: CurrencyService;
  let currencyConverterService: CurrencyConverterService;
  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        CurrencyConverterService,
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

    currencyService = TestBed.inject(CurrencyService);
    currencyConverterService = TestBed.inject(CurrencyConverterService);
  })

  test("should be created", () => {
    const service = TestBed.inject(CurrencyService);
    expect(service).toBeTruthy();
  })


  test('should load currencies on loadCurrencies call', () => {
    const getCurrenciesSpy = jest.spyOn(currencyService, 'getCurrencies').mockReturnValue(of({response: []}).pipe(delay(0)));
    currencyConverterService.loadCurrencies();

    expect(currencyConverterService.loading()).toBe(true);
    expect(getCurrenciesSpy).toHaveBeenCalled();

    jest.runAllTimers();

    expect(currencyConverterService.loading()).toBe(false);
  });

  test('should handle error on loadCurrencies call', () => {
    const getCurrenciesSpy = jest.spyOn(currencyService, 'getCurrencies').mockReturnValue(of({response: []}).pipe(delay(0),
      // Simulate an error
      switchMap(() => {
        throw new Error('Failed to load currencies');
      })
    ));
    currencyConverterService.loadCurrencies();
    expect(getCurrenciesSpy).toHaveBeenCalled();

    jest.runAllTimers();

    expect(currencyConverterService.status()).toBe('error');
  });


  test('should convert currency on convert call with debounced time', () => {
    const convertSpy = jest.spyOn(currencyService, 'convert').mockReturnValue(of({response: {value: 100}} as ConversionResponse).pipe(delay(0)));
    currencyConverterService.convertCurrency({from: 'USD', to: 'EUR', amount: 97, direction: 'source'});
    currencyConverterService.convertCurrency({from: 'USD', to: 'EUR', amount: 98, direction: 'source'});
    currencyConverterService.convertCurrency({from: 'USD', to: 'EUR', amount: 99, direction: 'source'});
    currencyConverterService.convertCurrency({from: 'USD', to: 'EUR', amount: 100, direction: 'source'});

    jest.advanceTimersByTime(300);

    expect(convertSpy).toHaveBeenCalledWith({from: 'USD', to: 'EUR', amount: 100});

    jest.runAllTimers();

    expect(currencyConverterService.conversionResult()).toBe(100);
    expect(currencyConverterService.status()).toBe('idle');
  });


  test('should handle error on convert call', () => {
    const convertSpy = jest.spyOn(currencyService, 'convert').mockReturnValue(of({response: {value: 0}} as ConversionResponse).pipe(delay(0),
      // Simulate an error
      switchMap(() => {
        throw new Error('Failed to convert currency');
      })
    ));
    currencyConverterService.convertCurrency({from: 'USD', to: 'EUR', amount: 100, direction: 'source'});

    jest.advanceTimersByTime(300);

    expect(convertSpy).toHaveBeenCalledWith({from: 'USD', to: 'EUR', amount: 100});

    jest.runAllTimers();

    expect(currencyConverterService.status()).toBe('error');
    expect(currencyConverterService.conversionResult()).toBeUndefined();
  });

  test('should convert on previewConversion call', () => {
    const convertSpy = jest.spyOn(currencyService, 'convert').mockReturnValue(of({response: {value: 50}} as ConversionResponse).pipe(delay(0)));
    currencyConverterService.previewConversion('USD', 'EUR');

    expect(convertSpy).toHaveBeenCalledWith({from: 'USD', to: 'EUR', amount: 1});

    jest.runAllTimers();

    expect(currencyConverterService.previewResult()).toBe(50);
    expect(currencyConverterService.status()).toBe('idle');

  });

  test('should handle error on previewConversion call', () => {
    const convertSpy = jest.spyOn(currencyService, 'convert').mockReturnValue(of({response: {value: 0}} as ConversionResponse).pipe(delay(0),
      // Simulate an error
      switchMap(() => {
        throw new Error('Failed to convert currency');
      })
    ));
    currencyConverterService.previewConversion('USD', 'EUR');

    expect(convertSpy).toHaveBeenCalledWith({from: 'USD', to: 'EUR', amount: 1});

    jest.runAllTimers();

    expect(currencyConverterService.status()).toBe('error');
    expect(currencyConverterService.previewResult()).toBeUndefined();
  })
});
