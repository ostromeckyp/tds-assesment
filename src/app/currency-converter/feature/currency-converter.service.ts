import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, map, Subject, switchMap, tap } from 'rxjs';
import { connect } from 'ngxtension/connect';
import { CurrencyService } from '../data-access/currency.service';
import { Conversion, ConversionQuery, ConversionResponse, Currency } from '../data-access/currency.model';
import { injectSetQuery } from '../../utils/set-query-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';

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
  // Query
  readonly queryParam = injectQueryParams<ConversionQuery>();
  private readonly setQuery = injectSetQuery();

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
  private previewCurrency$ = new Subject<{
    from: string;
    to: string;
    amount: number;
  }>();
  private readonly conversionPayload$ = new Subject<Conversion>();

  private readonly error$ = new Subject<string>();

  constructor() {
    const convertCurrency$ = this.conversionPayload$.pipe(
      distinctUntilChanged((prev, curr) => this.distinct(curr, prev)),
      debounceTime(300)
    );
    // side effects
    const currencyPreviewLoaded$ = this.previewCurrency$.pipe(
      switchMap(({from, to, amount}) =>
        this.currencyService.convert({from, to, amount}).pipe(
          map((response: ConversionResponse) =>
            response.response.value
          ),
          catchError(() => {
            this.error$.next('Failed to convert currency');
            return EMPTY;
          }),
        )
      ),
    );

    const currencyLoaded$ = this.loadCurrencies$
      .pipe(
        switchMap(() => this.currencyService.getCurrencies().pipe(
          map((response) => response.response),
          catchError(() => {
            this.error$.next('Failed to load currencies');
            return EMPTY;
          })
        )),
      )

    const currencyConverted$ = convertCurrency$
      .pipe(
        tap(({from, to, direction}) => {
          const q: ConversionQuery = direction === 'source'
            ? {from, to}
            : {from: to, to: from};
          const current = this.queryParam();
          if (current?.from !== q.from || current?.to !== q.to) {
            this.setQuery.setQueryParams<ConversionQuery>(q);
          }
        }),
        switchMap((conversion) => {
            return this.currencyService.convert({from: conversion.from, to: conversion.to, amount: conversion.amount})
              .pipe(
                map((response: ConversionResponse) => ({
                  lastConversion: conversion,
                  result: response.response.value
                })),
                catchError(() => {
                  this.error$.next('Failed to convert currency');
                  return EMPTY;
                }),
              );
          }
        )
      );

    // reducers
    connect(this.state)
      .with(this.loadCurrencies$, (state) => ({
        ...state,
        status: 'loading',
        error: undefined
      }))
      .with(currencyLoaded$, (state, currencies) => ({
          ...state,
          currencies,
          status: 'idle',
          error: undefined
        })
      )
      .with(convertCurrency$, (state) => ({
        ...state,
        conversionResult: undefined,
        error: undefined,
        status: 'loading'
      }))
      .with(currencyConverted$, (state, payload) => ({
        ...state,
        conversionResult: this.toFinanceFormat(payload.result),
        error: undefined,
        status: 'idle',
        lastConversion: payload.lastConversion
      }))
      .with(
        currencyPreviewLoaded$, (state, payload) => ({
          ...state,
          status: 'idle',
          previewResult: this.toFinanceFormat(payload),
        })
      )
      .with(this.error$, (state, error) => ({
        ...state,
        status: 'error',
        error
      }))
  }

  // API
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
      this.conversionPayload$.next({from, to, amount, direction});
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
