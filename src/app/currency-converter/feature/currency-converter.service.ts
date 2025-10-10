import { computed, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Conversion, ConversionQuery, ConversionResponse, Currency } from '../data-access/currency.model';
import { injectSetQuery } from '../../utils/set-query-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { derivedFrom } from 'ngxtension/derived-from';
import { debounceTime, distinctUntilChanged, map, pipe } from 'rxjs';

@Injectable()
export class CurrencyConverterService {
  private readonly injector = inject(Injector);

  // Query params
  readonly queryParam = injectQueryParams<ConversionQuery>();
  private readonly setQuery = injectSetQuery();

  // Sources
  private readonly convertCurrencyPayload = signal<Conversion | undefined>(undefined);
  private readonly previewConversionPayload = signal<{ from: string, to: string, amount: number } | undefined>(undefined)

  // State
  readonly conversionResult = signal<number | undefined>(undefined);
  readonly previewResult = signal<number | undefined>(undefined);
  private readonly lastConversion = signal<Conversion | undefined>(undefined);

  // Derived state
  private readonly conversionParams = derivedFrom([this.convertCurrencyPayload], pipe(
    distinctUntilChanged(([prev], [curr]) => this.distinct(curr!, prev)),
    debounceTime(300),
    map(([payload]) => {
      if (!payload) {
        return undefined;
      }
      const amount = payload.amount;
      const from = payload.from;
      const to = payload.to;
      const direction = payload.direction;
      return {from, to, amount, direction};
    }),
  ), {initialValue: this.convertCurrencyPayload()});

  // private readonly previewParams = computed(() => {
  //   const from = this.conversionParams()?.from;
  //   const to = this.conversionParams()?.to;
  //   return from && to && from !== to ? {from, to, amount: 1} : null;
  // });

  // Resources
   private readonly currenciesResource = httpResource<{ response: Currency[] }>(
    () => '/api/currencies',
    {
      defaultValue: {response: []},
      injector: this.injector
    }
  );

  private readonly conversionResource = httpResource<ConversionResponse>(
    () => {
      const params = this.conversionParams();
      return params ? `/api/convert?from=${params.from}&to=${params.to}&amount=${params.amount}` : undefined;
    },
    {
      defaultValue: undefined,
      injector: this.injector
    }
  );

  private readonly previewResource = httpResource<ConversionResponse>(
    () => {
      const params = this.previewConversionPayload();
      return params ? `/api/convert?from=${params.from}&to=${params.to}&amount=${params.amount}` : undefined;
    },
    {
      defaultValue: undefined,
      injector: this.injector
    }
  );

  // Selectors
  readonly currencies = computed(() => this.currenciesResource.value()?.response ?? []);
  readonly loading = computed(() => this.currenciesResource.isLoading() || this.conversionResource.isLoading() || this.previewResource.isLoading());
  readonly error = computed(() => this.currenciesResource.error() || this.conversionResource.error() || this.previewResource.error());
  readonly lastConversionMeta = computed(() => this.lastConversion());

  constructor() {
    effect(() => {
      const conversionData = this.conversionResource.value();
      untracked(() => {
        const lastConversion = this.convertCurrencyPayload();
        if (conversionData) {
          this.conversionResult.set(this.toFinanceFormat(conversionData.response.value));
          this.lastConversion.set(lastConversion);
        }
      });
    });

    effect(() => {
      const previewData = this.previewResource.value();
      if (previewData) {
        this.previewResult.set(this.toFinanceFormat(previewData.response.value));
      }
    });

    // Effect for query parameter synchronization
    effect(() => {
      const from = this.conversionParams()?.from;
      const to = this.conversionParams()?.to;
      const direction = this.conversionParams()?.direction;

      if(!from || !to || !direction) {
        return;
      }

      untracked(() => {
        const q: ConversionQuery = direction === 'source'
          ? {from, to}
          : {from: to, to: from};
        const current = this.queryParam();
        if (current?.from !== q.from || current?.to !== q.to) {
          this.setQuery.setQueryParams<ConversionQuery>(q);
        }
      });
    });

    // Effect for error logging
    effect(() => {
      const error = this.error();
      if (error) {
        console.error('Currency converter error:', error);
      }
    });
  }

  // API
  loadCurrencies(): void {
    // Currencies are automatically loaded via httpResource
    // This method is kept for backward compatibility but does nothing
    // as the resource handles loading automatically
  }

  convertCurrency({
                    from,
                    to,
                    amount,
                    direction
                  }: Conversion
  ): void {
    if (amount > 0 && from && to && from !== to) {

      this.convertCurrencyPayload.set({
        from,
        to,
        amount,
        direction
      })
    }
  }

  previewConversion(from: string, to: string): void {
    if (from && to && from !== to) {
      this.previewConversionPayload.set({from, to, amount: 1});
    }
  }

  private toFinanceFormat(value: number): number {
    return +(value.toFixed(2));
  }

  private distinct(current: Conversion, last?: Conversion): boolean {
    return JSON.stringify(current) === JSON.stringify(last);
  }
}
