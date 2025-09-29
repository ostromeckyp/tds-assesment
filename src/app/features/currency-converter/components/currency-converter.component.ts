import { ChangeDetectionStrategy, Component, effect, inject, model, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CurrencyService } from '../data-access/currency.service';
import { ActiveSide, Currency } from '../data-access/currency.model';

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
  templateUrl: './currency-converter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrencyConverterComponent {
  protected readonly currencyService = inject(CurrencyService);

  protected readonly currencies = this.currencyService.currencies;

  protected readonly sourceAmount = signal(1);
  protected readonly targetAmount = signal<number | undefined>(undefined);

  protected readonly sourceCurrency = model<Currency | undefined>(undefined);
  protected readonly targetCurrency = model<Currency | undefined>(undefined);

  protected readonly previewResult = this.currencyService.previewResult;

  private readonly activeSide = signal<ActiveSide>('source');

  constructor() {
    this.currencyService.loadCurrencies();

    effect(() => {
      const list = this.currencies();
      if (!list.length) {
        return;
      }
      const sourceCurr = list.find(c => c.short_code === 'USD');
      const targetCurr = list.find(c => c.short_code === 'EUR');

      if (!sourceCurr || !targetCurr) {
        return;
      }
      this.sourceCurrency.set(sourceCurr);
      this.targetCurrency.set(targetCurr);
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


      untracked(() => {
        const lastTarget = this.currencyService.lastConversionMeta();
        if (!sourceCurrency || !targetCurrency) return;

        if (side === 'source' && sAmount > 0 && this.distinct(sAmount, side, lastTarget)) {
          this.currencyService.convertCurrency(
            sourceCurrency.short_code,
            targetCurrency.short_code,
            sAmount,
            'source'
          );
        } else if (side === 'target' && tAmount && tAmount > 0 && this.distinct(tAmount, side, lastTarget)) {
          this.currencyService.convertCurrency(
            targetCurrency.short_code,
            sourceCurrency.short_code,
            tAmount,
            'target'
          );
        }
      });
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

  private distinct(amount: number, direction: ActiveSide, last?: {
    from: string;
    to: string;
    amount: number;
    direction: ActiveSide;
  }): boolean {
    const differentValue = amount !== last?.amount;
    const sameValueDifferentDirection = amount === last?.amount && direction !== last?.direction;
    return sameValueDifferentDirection || differentValue;
  }

}
