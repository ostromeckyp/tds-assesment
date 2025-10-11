import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Conversion, ConversionPayload, ConversionQuery } from '../data-access/currency.model';
import { injectSetQuery } from '../../utils/set-query-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { derivedFrom } from 'ngxtension/derived-from';
import { debounceTime, distinctUntilChanged, map, pipe } from 'rxjs';
import { CurrencyService } from '../data-access/currency.service';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable()
export class CurrencyConverterService {
  private readonly currencyService = inject(CurrencyService);

  // Query params
  readonly queryParam = injectQueryParams<ConversionQuery>();
  private readonly setQuery = injectSetQuery();

  // Sources
  private readonly convertCurrencyPayload = signal<Conversion | undefined>(undefined);
  private readonly previewConversionPayload = signal<{
    from: string,
    to: string,
    amount: number
  } | undefined>(undefined)

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


  // Resources
  private readonly currenciesResource = rxResource({
    stream: () => this.currencyService.getCurrencies(),
  });

  private readonly conversionResource = rxResource({
      params: () => {
        const params = this.conversionParams();
        if (!params) {
          return undefined;
        }
        return {
          from: params.from,
          to: params.to,
          amount: params.amount
        }
      },
      stream: ({params}) => this.currencyService.convert(params as ConversionPayload)
    }
  );

  private readonly previewResource = rxResource({
    params: () => {
      const payload = this.previewConversionPayload();
      if (!payload) {
        return undefined;
      }
      return {
        from: payload.from,
        to: payload.to,
        amount: 1
      }
    },
    stream: ({params}) => this.currencyService.convert(params as ConversionPayload)
  });

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

      if (!from || !to || !direction) {
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
