import type { APIRoute } from 'astro';

import {
  createWeddingWish,
  listWeddingWishes,
  validateWeddingWish,
} from '../../lib/wedding-wishes';

export const prerender = false;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const parseBody = async (request: Request) => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  const formData = await request.formData();
  return {
    name: formData.get('name'),
    message: formData.get('message'),
  };
};

export const GET: APIRoute = async ({ locals, url }) => {
  const db = locals.runtime.env.DB;
  if (!db) {
    return json({ error: 'Guestbook storage is not configured.' }, 503);
  }

  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '6', 10);

  try {
    const wishes = await listWeddingWishes(db, rawLimit);
    return json({ wishes });
  } catch (error) {
    console.error('Failed to load wedding wishes', error);
    return json({ error: 'Unable to load wishes right now.' }, 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.runtime.env.DB;
  if (!db) {
    return json({ error: 'Guestbook storage is not configured.' }, 503);
  }

  try {
    const payload = await parseBody(request);
    const validated = validateWeddingWish(payload);

    if ('error' in validated) {
      return json({ error: validated.error }, 400);
    }

    const wish = await createWeddingWish(db, validated.data);
    return json({ wish }, 201);
  } catch (error) {
    console.error('Failed to save wedding wish', error);
    return json({ error: 'Unable to save your wish right now.' }, 500);
  }
};
