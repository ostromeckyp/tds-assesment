import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, Subject, switchMap, tap } from 'rxjs';
import { connect } from 'ngxtension/connect';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActiveSide, ConversionResponse, Currency } from './currency.model';

interface CurrencyState {
  currencies: Currency[];
  status: 'loading' | 'idle' | 'error';
  error: string | undefined;
  conversionResult: number | undefined;
  previewResult: number | undefined;
  lastConversion:
    | {
    from: string;
    to: string;
    amount: number;
    direction: ActiveSide;
  }
    | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly API_KEY = 'bj8MCmjkq65UPYQIoTa8IxkgQTWf3NmK';
  private readonly BASE_URL = 'https://api.currencybeacon.com/v1';

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

  private readonly convertCurrency$ = new Subject<{
    from: string;
    to: string;
    amount: number;
    direction: ActiveSide;
  }>();
  private readonly convertSuccess$ = new Subject<{
    result: number;
  }>();
  private readonly convertError$ = new Subject<string>();

  constructor(private readonly http: HttpClient) {

    // side effects
    this.previewCurrency$.pipe(
      switchMap(({from, to, amount}) =>
        this.http.get<ConversionResponse>(`${this.BASE_URL}/convert?api_key=${this.API_KEY}&from=${from}&to=${to}&amount=${amount}`)
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
          this.http.get<{ response: Currency[] }>(
            `${this.BASE_URL}/currencies?api_key=${this.API_KEY}`
          )
        ),
        tap(({response}) => this.loadCurrenciesSuccess$.next(response)),
        catchError(() => {
          this.loadCurrenciesError$.next('Failed to load currencies');
          return of([]);
        }),
        takeUntilDestroyed()
      )
      .subscribe();

    this.convertCurrency$
      .pipe(
        switchMap(({from, to, amount}) =>
          this.http
            .get<ConversionResponse>(
              `${this.BASE_URL}/convert?api_key=${this.API_KEY}&from=${from}&to=${to}&amount=${amount}`
            )
            .pipe(
              tap((response: ConversionResponse) =>
                this.convertSuccess$.next({result: response.response.value})
              ),
              catchError(() => {
                this.convertError$.next('Failed to convert currency');
                return of({response: {amount: 0}} as ConversionResponse);
              })
            )
        ),
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
      .with(this.loadCurrenciesSuccess$, (state, currencies) => ({
        ...state,
        currencies,
        status: 'idle',
        error: undefined
      }))
      .with(this.loadCurrenciesError$, (state, error) => ({
        ...state,
        status: 'error',
        error
      }))
      .with(this.convertCurrency$, (state, payload) => ({
        ...state,
        converting: true,
        conversionResult: undefined,
        error: undefined,
        status: 'loading',
        lastConversion: {
          from: payload.from,
          to: payload.to,
          amount: payload.amount,
          direction: payload.direction
        }
      }))
      .with(this.convertSuccess$, (state, {result}) => ({
        ...state,
        conversionResult: this.toFinanceFormat(result),
        status: 'idle',
        error: undefined
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
    );
  }

  loadCurrencies(): void {
    this.loadCurrencies$.next();
  }

  convertCurrency(
    from: string,
    to: string,
    amount: number,
    direction: ActiveSide
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
}
