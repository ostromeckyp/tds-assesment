import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap, tap } from 'rxjs';
import { connect } from 'ngxtension/connect';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyService } from '../data-access/currency.service';
import { Conversion, ConversionResponse, Currency } from '../data-access/currency.model';

interface CurrencyState {
  currencies: Currency[];
  status: 'loading' | 'idle' | 'error';
  error: string | undefined;
  conversionResult: number | undefined;
  previewResult: number | undefined;
  lastConversion: Conversion | undefined;
}

@Injectable()
export class CurrencyConverterService {
  private readonly currencyService = inject(CurrencyService);

  // state
  private readonly state = signal<CurrencyState>({
    currencies: [],
    status: 'idle',
    error: undefined,
    conversionResult: undefined,
    previewResult: undefined,
    lastConversion: undefined
  });

  // selectors
  readonly currencies = computed(() => this.state().currencies);
  readonly loading = computed(() => this.state().status === 'loading');
  readonly status = computed(() => this.state().status);
  readonly error = computed(() => this.state().error);
  readonly conversionResult = computed(() => this.state().conversionResult);
  readonly lastConversionMeta = computed(() => this.state().lastConversion);
  readonly previewResult = computed(() => this.state().previewResult);

  // sources
  private readonly loadCurrencies$ = new Subject<void>();
  private loadCurrenciesSuccess$ = new Subject<Currency[]>();
  private loadCurrenciesError$ = new Subject<string>();
  private previewCurrency$ = new Subject<{
    from: string;
    to: string;
    amount: number;
  }>();
  private previewCurrencySuccess$ = new Subject<{ result: number }>();
  private previewCurrencyError$ = new Subject<string>();

  private readonly convertCurrency$ = new Subject<Conversion>();
  private readonly convertSuccess$ = new Subject<{
    result: number;
    lastConversion: Conversion;
  }>();
  private readonly convertError$ = new Subject<string>();

  constructor() {
    // side effects
    this.previewCurrency$.pipe(
      switchMap(({from, to, amount}) =>
        this.currencyService.convert({from, to, amount})
      ),
      tap((response: ConversionResponse) =>
        this.previewCurrencySuccess$.next({result: response.response.value})
      ),
      catchError(() => {
        this.previewCurrencyError$.next('Failed to convert currency');
        return of({response: {amount: 0}} as ConversionResponse);
      }),
      takeUntilDestroyed()
    ).subscribe();


    this.loadCurrencies$
      .pipe(
        switchMap(() =>
          this.currencyService.getCurrencies()
        ),
        tap(({response}) => {
          this.loadCurrenciesSuccess$.next(response)
        }),
        catchError(() => {
          this.loadCurrenciesError$.next('Failed to load currencies');
          return of([]);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    this.convertCurrency$
      .pipe(
        distinctUntilChanged((prev, curr) => this.distinct(curr, prev)),
        debounceTime(300),
        switchMap((conversion) => {
            return this.currencyService.convert({from: conversion.from, to: conversion.to, amount: conversion.amount})
              .pipe(
                map((response: ConversionResponse) => ({
                  lastConversion: conversion,
                  result: response.response.value
                }))
              );
          }
        ),
        tap(({lastConversion, result}) =>
          this.convertSuccess$.next({
            result, lastConversion
          })
        ),
        catchError(() => {
          this.convertError$.next('Failed to convert currency');
          return of({response: {amount: 0}} as ConversionResponse);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    // reducers
    connect(this.state)
      .with(this.loadCurrencies$, (state) => ({
        ...state,
        status: 'loading',
        error: undefined
      }))
      .with(this.loadCurrenciesSuccess$, (state, currencies) =>
        ({
            ...state,
            currencies,
            status: 'idle',
            error: undefined
          }
        ))
      .with(this.loadCurrenciesError$, (state, error) => ({
        ...state,
        status: 'error',
        error
      }))
      //TODO - to be discussed on demo
      .with(this.convertCurrency$.pipe(
        distinctUntilChanged((prev, curr) => this.distinct(curr, prev))
      ), (state, payload) => ({
        ...state,
        converting: true,
        conversionResult: undefined,
        error: undefined,
        status: 'loading'
      }))
      .with(this.convertSuccess$, (state, {result, lastConversion}) => ({
        ...state,
        conversionResult: this.toFinanceFormat(result),
        error: undefined,
        status: 'idle',
        lastConversion
      }))
      .with(this.convertError$, (state, error) => ({
          ...state,
          status: 'error',
          error
        })
      ).with(
      this.previewCurrencySuccess$, (state, {result}) => ({
        ...state,
        status: 'idle',
        previewResult: this.toFinanceFormat(result),
      })
    ).with(
      this.previewCurrencyError$, (state, error) => ({
        ...state,
        status: 'error',
        error
      })
    );
  }

  loadCurrencies(): void {
    this.loadCurrencies$.next();
  }

  convertCurrency({
                    from,
                    to,
                    amount,
                    direction
                  }: Conversion
  ): void {
    if (amount > 0 && from && to && from !== to) {
      this.convertCurrency$.next({from, to, amount, direction});
    }
  }

  previewConversion(from: string, to: string): void {
    const amount = 1;
    if (amount > 0 && from && to && from !== to) {
      this.previewCurrency$.next({from, to, amount});
    }
  }

  private toFinanceFormat(value: number): number {
    return +(value.toFixed(2));
  }

  private distinct(current: Conversion, last?: Conversion): boolean {
    return JSON.stringify(current) === JSON.stringify(last);
  }
}
