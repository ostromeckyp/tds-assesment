import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { http } from './http.util';
import { Currency } from './api.model';

const CURRENCY_BEACON_API_KEY = defineSecret('CURRENCY_BEACON_API_KEY');

export const convert = onRequest(
  { cors: true, secrets: [CURRENCY_BEACON_API_KEY] },
  async (req: any, res: any) => {
    const { from, to, amount } = req.query as Record<string, string>;
    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing parameters: from, to, amount' });
    }

    const url = new URL('https://api.currencybeacon.com/v1/convert');

    url.searchParams.set('api_key', CURRENCY_BEACON_API_KEY.value());
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('amount', amount);

    const { data, status, error } = await http.get<unknown>(url.toString());

    if (error) {
      const message = error.message || 'Unexpected error';
      const statusCode = error.status || 500;
      return res.status(statusCode).json({ error: message });
    }
    if (!data) {
      return res.status(500).json({ error: 'Invalid response from currency API' });
    }
    return res.status(status).json(data);
  }
);

export const currencies = onRequest(
  { cors: true, secrets: [CURRENCY_BEACON_API_KEY] },
  async (_req: any, res: any) => {
    const url = new URL('https://api.currencybeacon.com/v1/currencies');
    url.searchParams.set('api_key', CURRENCY_BEACON_API_KEY.value());

    // logger.log('URL: ', url.toString());

    const { data, status, error } = await http.get<unknown>(url.toString());

    if (error) {
      const message = error.message || 'Unexpected error';
      const statusCode = error.status || 500;
      return res.status(statusCode).json({ error: message });
    }
    if (!data) {
      return res.status(500).json({ error: 'Invalid response from currency API' });
    }

    const resp = (data as any)?.response ?? data;
    if (!resp) {
      return res.status(500).json({ error: 'Unexpected payload from currency API' });
    }

    const arr = Object.entries(resp as Record<string, Currency>)
      .map(([code, v]) => ({ ...v }));

    return res.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400 stale-if-error=604800').status(status).json({ response: arr });
  }
);
