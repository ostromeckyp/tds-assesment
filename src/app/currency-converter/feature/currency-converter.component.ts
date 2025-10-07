import { ChangeDetectionStrategy, Component, effect, inject, model, signal, untracked, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActiveSide, Currency } from '../data-access/currency.model';
import { CurrencyConverterService } from './currency-converter.service';

@Component({
  selector: 'app-currency-converter',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule
  ],
  providers: [CurrencyConverterService],
  templateUrl: './currency-converter.component.html',
  styleUrl: './currency-converter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrencyConverterComponent {
  protected readonly currencyService = inject(CurrencyConverterService);

  protected readonly currencies = this.currencyService.currencies;
  protected readonly previewResult = this.currencyService.previewResult;

  protected readonly sourceAmount = signal(1);
  protected readonly targetAmount = signal<number | undefined>(undefined);
  private readonly activeSide = signal<ActiveSide>('source');
  protected readonly sourceCurrency = model<Currency | undefined>(undefined);
  protected readonly targetCurrency = model<Currency | undefined>(undefined);

  constructor() {
    this.currencyService.loadCurrencies();

    effect(() => {
      const list = this.currencies();
      if (!list.length) {
        return;
      }

      // default to USD -> EUR for demo purposes
      untracked(() => {
        const query = this.currencyService.queryParam();
        const sourceCurr = list.find(c => query?.from ? c.short_code === query.from : c.short_code === 'USD');
        const targetCurr = list.find(c => query?.to ? c.short_code === query.to : c.short_code === 'EUR');

        if (!sourceCurr || !targetCurr) {
          return;
        }
        this.sourceCurrency.set(sourceCurr);
        this.targetCurrency.set(targetCurr);
      })
    });

    effect(() => {
      const sourceCurrency = this.sourceCurrency();
      const targetCurrency = this.targetCurrency();

      if (!sourceCurrency || !targetCurrency) return;

      this.currencyService.previewConversion(sourceCurrency.short_code, targetCurrency.short_code);
    });

    effect(() => {
      const sourceCurrency = this.sourceCurrency();
      const targetCurrency = this.targetCurrency();
      const side = this.activeSide();
      const sAmount = this.sourceAmount();
      const tAmount = this.targetAmount();

      if (!sourceCurrency || !targetCurrency) return;

      if (side === 'source') {
        this.currencyService.convertCurrency({
          from: sourceCurrency.short_code,
          to: targetCurrency.short_code,
          amount: sAmount,
          direction: 'source'
        });
      } else if (side === 'target') {
        this.currencyService.convertCurrency({
          from: targetCurrency.short_code,
          to: sourceCurrency.short_code,
          amount: tAmount ?? 0,
          direction: 'target'
        });
      }
    });

    effect(() => {
      const result = this.currencyService.conversionResult();
      const meta = this.currencyService.lastConversionMeta();
      if (result === undefined || !meta) return;

      meta.direction === 'source' ? this.targetAmount.set(result) : this.sourceAmount.set(result);
    });
  }

  protected onSourceAmountInput(value: string | number): void {
    const numeric = Number(value) || 0;
    this.activeSide.set('source');
    this.sourceAmount.set(numeric);
  }

  protected onTargetAmountInput(value: string | number): void {
    const numeric = Number(value) || 0;
    this.activeSide.set('target');
    this.targetAmount.set(numeric);
  }

  protected swapCurrencies(): void {
    const currentSource = this.sourceCurrency();
    const currentTarget = this.targetCurrency();

    if (currentSource && currentTarget) {
      this.sourceCurrency.set(currentTarget);
      this.targetCurrency.set(currentSource);

      // Swap the amounts as well
      const currentSourceAmount = this.sourceAmount();
      const currentTargetAmount = this.targetAmount();

      this.sourceAmount.set(currentTargetAmount || 0);
      this.targetAmount.set(currentSourceAmount);

      // Set active side to source after swap
      this.activeSide.set('source');
    }
  }

  protected preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+', '-'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
    }
  }
}
