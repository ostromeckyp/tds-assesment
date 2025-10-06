// `functions/src/index.ts`
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { http } from './http.util';

const CURRENCY_BEACON_API_KEY = defineSecret('CURRENCY_BEACON_API_KEY');
const url = new URL('https://api.currencybeacon.com/v1/convert');

export const convert = onRequest(
  { cors: true, secrets: [CURRENCY_BEACON_API_KEY] },
  async (req: any, res: any) => {
    const { from, to, amount } = req.query as Record<string, string>;
    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing parameters: from, to, amount' });
    }

    url.searchParams.set('api_key', CURRENCY_BEACON_API_KEY.value());
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('amount', amount);

    const { data, status, error } = await http.get<object>(url.toString());

    if (!data) {
      return res.status(500).json({ error: 'Invalid response from currency API' });
    }

    if (error) {
      const message = error?.message || 'Unexpected error';
      const statusCode = error?.status || 500;
      return res.status(statusCode).json({ error: message });
    }
    return res.status(status).json(data);
  }
);

export const currencies = onRequest(
  { cors: true, secrets: [CURRENCY_BEACON_API_KEY] },
  async (req: any, res: any) => {
    url.searchParams.set('api_key', CURRENCY_BEACON_API_KEY.value());

    const { data, status, error } = await http.get<Record<number, object>>(url.toString());

    if (!data) {
      return res.status(500).json({ error: 'Invalid response from currency API' });
    }
    if (error) {
      const message = error?.message || 'Unexpected error';
      const statusCode = error?.status || 500;
      return res.status(statusCode).json({ error: message });
    }

    const arr = Object.entries(data).map(([code, v]: [string, any]) => ({
      code,
      name: v?.name ?? v?.name_plural ?? v?.label ?? code,
    }));
    const body = { response: arr };

    return res.status(status).json(body);
  }
);
