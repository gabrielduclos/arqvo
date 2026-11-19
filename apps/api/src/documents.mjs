import { fromNodeHeaders } from 'better-auth/node';

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
]);
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(reply, code, error) {
  return reply.code(code).send({ error });
}

export function validObjectKey(userId, key) {
  return typeof userId === 'string'
    && typeof key === 'string'
    && key.startsWith(encodeURIComponent(userId) + '/')
    && UUID_RE.test(key.slice(encodeURIComponent(userId).length + 1));
}

export function validFilename(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 255
    && !/[\u0000-\u001f\u007f]/.test(name)
    && !/[\\/]/.test(name);
}

export function registerDocumentRoutes(app, { pool, auth, authBaseURL }) {
  async function requireSession(request, reply) {
    reply.header('Cache-Control', 'no-store');
    if (!auth || !pool) { sendError(reply, 503, 'unavailable'); return null; }
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session?.user?.id || !session.user.emailVerified) {
        sendError(reply, 401, 'unauthorized');
        return null;
      }
      return session.user.id;
    } catch (err) {
      request.log.error({ err }, 'Document auth failed');
      sendError(reply, 503, 'auth_unavailable');
      return null;
    }
  }

  function requireOrigin(request, reply) {
    const origin = request.headers.origin;
    if (!origin || origin !== authBaseURL) {
      sendError(reply, 403, 'origin_forbidden');
      return false;
    }
    return true;
  }

  function queryDoc(ownerId, id) {
    return pool.query(
      `SELECT id, original_filename AS "filename", mime_type AS "mimeType",
              size_bytes AS "sizeBytes", object_key AS "objectKey", status,
              merchant, document_date AS "documentDate",
              amount_cents AS "amountCents", currency, extracted_text AS "extractedText",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM public.documents WHERE owner_uid=$1 AND id=$2`,
      [ownerId, id]
    );
  }

  app.get('/api/documents', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId) return;
    const params = request.query || {};
    const rawQ = typeof params.q === 'string' ? params.q.trim().slice(0, 160) : '';
    const merchant = typeof params.merchant === 'string' ? params.merchant.trim().slice(0, 150) : '';
    const dateStart = typeof params.dateStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.dateStart) ? params.dateStart : null;
    const dateEnd = typeof params.dateEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.dateEnd) ? params.dateEnd : null;
    const amountMin = Number.isSafeInteger(Number(params.amountMin)) && params.amountMin !== undefined
      && String(params.amountMin) !== '' && Number(params.amountMin) >= 0 ? Number(params.amountMin) : null;
    const amountMax = Number.isSafeInteger(Number(params.amountMax)) && params.amountMax !== undefined
      && String(params.amountMax) !== '' && Number(params.amountMax) >= 0 ? Number(params.amountMax) : null;
    try {
      const result = await pool.query(
        `SELECT id, original_filename AS "filename", mime_type AS "mimeType",
                size_bytes AS "sizeBytes", status, merchant,
                (extracted_text IS NOT NULL AND length(trim(extracted_text)) > 0) AS "hasExtractedText",
                document_date AS "documentDate", amount_cents AS "amountCents",
                currency, created_at AS "createdAt"
         FROM public.documents
         WHERE owner_uid=$1
           AND ($2::text IS NULL OR position(lower($2) in lower(
             coalesce(original_filename,'') || ' ' || coalesce(merchant,'') || ' ' || coalesce(extracted_text,'')))>0)
           AND ($3::text IS NULL OR position(lower($3) in lower(coalesce(merchant,'')))>0)
           AND ($4::date IS NULL OR document_date >= $4)
           AND ($5::date IS NULL OR document_date <= $5)
           AND ($6::bigint IS NULL OR amount_cents >= $6)
           AND ($7::bigint IS NULL OR amount_cents <= $7)
         ORDER BY created_at DESC LIMIT 100`,
        [userId, rawQ || null, merchant || null, dateStart, dateEnd, amountMin, amountMax]
      );
      return { documents: result.rows };
    } catch (err) {
      request.log.error({ err }, 'Document list failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  app.get('/api/documents/:id', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId) return;
    if (!UUID_RE.test(request.params.id)) return sendError(reply, 400, 'invalid_document_id');
    try {
      const result = await queryDoc(userId, request.params.id);
      if (!result.rowCount) return sendError(reply, 404, 'document_not_found');
      return { document: result.rows[0] };
    } catch (err) {
      request.log.error({ err }, 'Document lookup failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  app.post('/api/documents', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    const { filename, mimeType, sizeBytes, objectKey } = request.body || {};
    if (!validFilename(filename) || !ALLOWED_MIME.has(mimeType)
        || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_FILE_BYTES
        || !validObjectKey(userId, objectKey)) {
      return sendError(reply, 400, 'invalid_document');
    }
    try {
      const count = await pool.query('SELECT count(*)::int AS total FROM public.documents WHERE owner_uid=$1', [userId]);
      if (count.rows[0].total >= 100) return sendError(reply, 429, 'document_limit');
      const result = await pool.query(
        `INSERT INTO public.documents (owner_uid, original_filename, mime_type, size_bytes, object_key)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, original_filename AS "filename", mime_type AS "mimeType",
                   size_bytes AS "sizeBytes", status, created_at AS "createdAt"`,
        [userId, filename, mimeType, sizeBytes, objectKey]
      );
      return reply.code(201).send({ document: result.rows[0] });
    } catch (err) {
      request.log.error({ err }, 'Document insert failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  app.patch('/api/documents/:id/analysis', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    if (!UUID_RE.test(request.params.id)) return sendError(reply, 400, 'invalid_document_id');
    const body = request.body || {};
    const extractedText = typeof body.extractedText === 'string' ? body.extractedText.slice(0, 25000) : '';
    const merchant = typeof body.merchant === 'string' && body.merchant.trim().length <= 160 ? body.merchant.trim() : null;
    const documentDate = typeof body.documentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.documentDate)
      ? body.documentDate : null;
    const amountCents = Number.isSafeInteger(body.amountCents) && body.amountCents >= 0 && body.amountCents <= 100000000000
      ? body.amountCents : null;
    try {
      const result = await pool.query(
        `UPDATE public.documents
         SET extracted_text=$3, merchant=$4, document_date=$5, amount_cents=$6,
             status=CASE WHEN
               ((length(trim(coalesce($4::text,'')))>0 AND ($5::date IS NOT NULL OR $6::bigint IS NOT NULL))
               OR ($5::date IS NOT NULL AND $6::bigint IS NOT NULL))
               THEN 'ready' ELSE 'uploaded' END,
             updated_at=now()
         WHERE owner_uid=$1 AND id=$2
         RETURNING id, original_filename AS "filename", mime_type AS "mimeType",
                   size_bytes AS "sizeBytes", status, merchant,
                   document_date AS "documentDate", amount_cents AS "amountCents",
                   currency, created_at AS "createdAt"`,
        [userId, request.params.id, extractedText, merchant || null, documentDate, amountCents]
      );
      if (!result.rowCount) return sendError(reply, 404, 'document_not_found');
      return { document: result.rows[0] };
    } catch (err) {
      request.log.error({ err }, 'Document analysis update failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  app.delete('/api/documents/:id', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    if (!UUID_RE.test(request.params.id)) return sendError(reply, 400, 'invalid_document_id');
    try {
      const result = await pool.query(
        'DELETE FROM public.documents WHERE owner_uid=$1 AND id=$2 RETURNING object_key AS "objectKey"',
        [userId, request.params.id]
      );
      if (!result.rowCount) return sendError(reply, 404, 'document_not_found');
      return { deleted: true, objectKey: result.rows[0].objectKey };
    } catch (err) {
      request.log.error({ err }, 'Document deletion failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  app.post('/api/ai/consume', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const today = `(now() AT TIME ZONE 'UTC')::date`;
      for (const [owner, limit] of [['__global__', 40], [userId, 8]]) {
        const result = await client.query(
          `INSERT INTO public.ai_usage(owner_uid,usage_day,used) VALUES ($1,${today},1)
           ON CONFLICT(owner_uid,usage_day) DO UPDATE SET used=public.ai_usage.used+1
           WHERE public.ai_usage.used < $2 RETURNING used`,
          [owner, limit]
        );
        if (!result.rowCount) {
          await client.query('ROLLBACK');
          return sendError(reply, 429, 'ai_daily_limit');
        }
      }
      await client.query('COMMIT');
      return { allowed: true };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      request.log.error({ err }, 'AI quota failed');
      return sendError(reply, 503, 'ai_unavailable');
    } finally {
      client.release();
    }
  });
}
