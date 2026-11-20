import { fromNodeHeaders } from 'better-auth/node';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
]);
export const DOCUMENT_CATEGORIES = new Set([
  'alimentacao', 'mercado', 'combustivel', 'transporte', 'farmacia',
  'saude', 'moradia', 'contas', 'educacao', 'lazer',
  'compras', 'servicos', 'outros'
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

function signDocumentJob(secret, ownerId, documentId, objectKey) {
  if (typeof secret !== 'string' || secret.length < 20) return null;
  return createHmac('sha256', secret)
    .update('arqvo:document-job:v1:' + ownerId + ':' + documentId + ':' + objectKey)
    .digest('hex');
}

function validJobToken(expected, provided) {
  if (!expected || typeof provided !== 'string' || !/^[a-f0-9]{64}$/i.test(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
}

export function registerDocumentRoutes(app, { pool, auth, authBaseURL, jobSigningSecret }) {
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
              merchant, category, subcategory, document_date AS "documentDate",
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
    const text = (name, max) => {
      const value = params[name];
      return value === undefined ? '' : typeof value === 'string' && value.length <= max
        ? value.trim() : null;
    };
    const date = (name) => {
      const value = text(name, 10);
      if (value === null || !value) return value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const d = new Date(value + 'T00:00:00.000Z');
      return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value ? value : null;
    };
    const cents = (name) => {
      const value = text(name, 12);
      if (value === null || !value) return value === '' ? null : NaN;
      return /^\d{1,12}$/.test(value) && Number(value) <= 100000000000
        && Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
    };

    const q = text('q', 160);
    const merchant = text('merchant', 150);
    const category = text('category', 30);
    const dateStart = date('dateStart');
    const dateEnd = date('dateEnd');
    const uploadStart = date('uploadStart');
    const uploadEnd = date('uploadEnd');
    const amountMin = cents('amountMin');
    const amountMax = cents('amountMax');
    const type = text('type', 12);
    const analysis = text('analysis', 14);
    const sort = text('sort', 30) || 'newest';

    const sorts = {
      newest: 'created_at DESC, id DESC',
      oldest: 'created_at ASC, id ASC',
      document_newest: 'document_date DESC NULLS LAST, created_at DESC, id DESC',
      document_oldest: 'document_date ASC NULLS LAST, created_at DESC, id DESC',
      amount_high: 'amount_cents DESC NULLS LAST, created_at DESC, id DESC',
      amount_low: 'amount_cents ASC NULLS LAST, created_at DESC, id DESC',
      merchant: 'lower(merchant) ASC NULLS LAST, created_at DESC, id DESC'
    };
    if (q === null || merchant === null || category === null ||
        (category && !DOCUMENT_CATEGORIES.has(category)) ||
        dateStart === null || dateEnd === null || uploadStart === null || uploadEnd === null ||
        Number.isNaN(amountMin) || Number.isNaN(amountMax) ||
        type === null || !['', 'pdf', 'image'].includes(type) ||
        analysis === null || !['', 'ready', 'partial', 'text_only', 'pending', 'failed'].includes(analysis) ||
        !Object.hasOwn(sorts, sort) ||
        (dateStart && dateEnd && dateStart > dateEnd) ||
        (uploadStart && uploadEnd && uploadStart > uploadEnd) ||
        (amountMin !== null && amountMax !== null && amountMin > amountMax)) {
      return sendError(reply, 400, 'invalid_filters');
    }
    try {
      // The sort SQL is chosen from a fixed whitelist; all values remain bound.
      const result = await pool.query(
        `WITH owned AS (
           SELECT id, original_filename, mime_type, size_bytes, status,
                  merchant, category, subcategory, document_date, amount_cents, currency, created_at,
                  extracted_text,
                  CASE
                    WHEN status = 'ready' THEN 'ready'
                    WHEN status = 'failed' THEN 'failed'
                    WHEN nullif(btrim(merchant), '') IS NOT NULL
                      OR document_date IS NOT NULL OR amount_cents IS NOT NULL THEN 'partial'
                    WHEN nullif(btrim(extracted_text), '') IS NOT NULL THEN 'text_only'
                    ELSE 'pending'
                  END AS analysis_state
           FROM public.documents WHERE owner_uid=$1
         )
         SELECT id, original_filename AS "filename", mime_type AS "mimeType",
                size_bytes AS "sizeBytes", status, merchant, category, subcategory,
                (nullif(btrim(extracted_text),'') IS NOT NULL) AS "hasExtractedText",
                analysis_state AS "analysisState",
                document_date AS "documentDate", amount_cents AS "amountCents",
                currency, created_at AS "createdAt"
         FROM owned
         WHERE ($2::text IS NULL OR position(lower($2) IN lower(
           coalesce(original_filename,'') || ' ' || coalesce(merchant,'') || ' ' ||
           coalesce(extracted_text,'') || ' ' || coalesce(subcategory,''))) > 0)
           AND ($3::text IS NULL OR position(lower($3) IN lower(coalesce(merchant,''))) > 0)
           AND ($4::date IS NULL OR document_date >= $4)
           AND ($5::date IS NULL OR document_date <= $5)
           AND ($6::bigint IS NULL OR amount_cents >= $6)
           AND ($7::bigint IS NULL OR amount_cents <= $7)
           AND ($8::date IS NULL OR created_at >= ($8::date::timestamp AT TIME ZONE 'UTC'))
           AND ($9::date IS NULL OR created_at < (($9::date + 1)::timestamp AT TIME ZONE 'UTC'))
           AND ($10::text IS NULL OR ($10='pdf' AND mime_type='application/pdf')
                OR ($10='image' AND mime_type LIKE 'image/%'))
           AND ($11::text IS NULL OR analysis_state = $11)
           AND ($12::text IS NULL OR category = $12)
         ORDER BY ${sorts[sort]} LIMIT 100`,
        [userId, q || null, merchant || null, dateStart || null, dateEnd || null,
          amountMin, amountMax, uploadStart || null, uploadEnd || null, type || null, analysis || null, category || null]
      );
      return { documents: result.rows };
    } catch (err) {
      request.log.error({ err }, 'Document filtered list failed');
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
      const document = result.rows[0];
      const jobToken = signDocumentJob(jobSigningSecret, userId, document.id, objectKey);
      return reply.code(201).send({ document, jobToken });
    } catch (err) {
      request.log.error({ err }, 'Document insert failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  async function saveAnalysis(userId, id, body) {
    const extractedText = typeof body.extractedText === 'string' ? body.extractedText.slice(0, 25000) : '';
    const merchant = typeof body.merchant === 'string' && body.merchant.trim().length <= 160 ? body.merchant.trim() : null;
    const documentDate = typeof body.documentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.documentDate)
      ? body.documentDate : null;
    const amountCents = Number.isSafeInteger(body.amountCents) && body.amountCents >= 0 && body.amountCents <= 100000000000
      ? body.amountCents : null;
    const category = typeof body.category === 'string' && DOCUMENT_CATEGORIES.has(body.category) ? body.category : null;
    const subcategory = category && typeof body.subcategory === 'string' && body.subcategory.trim().length <= 80
      ? body.subcategory.trim() || null : null;
    try {
      const result = await pool.query(
        `UPDATE public.documents
         SET extracted_text=$3,
             merchant=CASE WHEN merchant_manual THEN merchant ELSE $4 END,
             document_date=$5, amount_cents=$6,
             category=CASE WHEN category_manual THEN category ELSE $7 END,
             subcategory=CASE WHEN category_manual THEN subcategory ELSE $8 END,
             status=CASE WHEN
               (nullif(btrim(CASE WHEN merchant_manual THEN merchant ELSE $4::text END),'') IS NOT NULL
                AND ($5::date IS NOT NULL OR $6::bigint IS NOT NULL))
               OR ($5::date IS NOT NULL AND $6::bigint IS NOT NULL)
               THEN 'ready' ELSE 'uploaded' END,
             updated_at=now()
         WHERE owner_uid=$1 AND id=$2
         RETURNING id, original_filename AS "filename", mime_type AS "mimeType",
                   size_bytes AS "sizeBytes", status, merchant, category, subcategory,
                   document_date AS "documentDate", amount_cents AS "amountCents",
                   currency, created_at AS "createdAt"`,
        [userId, id, extractedText, merchant || null, documentDate, amountCents, category, subcategory]
      );
      if (!result.rowCount) return { error: 'document_not_found', status: 404 };
      return { document: result.rows[0] };
    } catch (err) {
      app.log.error({ err }, 'Document analysis update failed');
      return { error: 'documents_unavailable', status: 503 };
    }
  }

  app.patch('/api/documents/:id/analysis', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    if (!UUID_RE.test(request.params.id)) return sendError(reply, 400, 'invalid_document_id');
    const result = await saveAnalysis(userId, request.params.id, request.body || {});
    if (result.error) return sendError(reply, result.status, result.error);
    return result;
  });

  // The Worker calls this authenticated endpoint when the user retries a
  // previously uploaded document. The scoped token never reaches the browser.
  app.post('/api/documents/:id/job-token', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    const id = request.params.id;
    if (!UUID_RE.test(id)) return sendError(reply, 400, 'invalid_document_id');
    try {
      const found = await queryDoc(userId, id);
      if (!found.rowCount) return sendError(reply, 404, 'document_not_found');
      const doc = found.rows[0];
      const jobToken = signDocumentJob(jobSigningSecret, userId, id, doc.objectKey);
      if (!jobToken) return sendError(reply, 503, 'job_signing_unavailable');
      return { document: doc, jobToken };
    } catch (err) {
      request.log.error({ err }, 'Document job authorization failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  // The Cloudflare Queue consumer has no user session. It receives an HMAC
  // capability bound to one owner, one immutable document ID and R2 object key.
  // A leaked document ID or object key alone cannot authorize a write.
  app.post('/api/internal/documents/:id/analysis', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const id = request.params.id;
    if (!UUID_RE.test(id)) return sendError(reply, 400, 'invalid_document_id');
    const provided = request.headers['x-arqvo-job-token'];
    if (typeof provided !== 'string') return sendError(reply, 403, 'invalid_job_token');
    try {
      const found = await pool.query(
        'SELECT owner_uid, object_key FROM public.documents WHERE id=$1', [id]
      );
      if (!found.rowCount) return sendError(reply, 404, 'document_not_found');
      const { owner_uid: owner, object_key: key } = found.rows[0];
      const expected = signDocumentJob(jobSigningSecret, owner, id, key);
      if (!validJobToken(expected, provided)) return sendError(reply, 403, 'invalid_job_token');
      const result = await saveAnalysis(owner, id, request.body || {});
      if (result.error) return sendError(reply, result.status, result.error);
      return result;
    } catch (err) {
      request.log.error({ err }, 'Background document analysis failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  // If a mobile browser aborts at the upload/commit boundary, the queue can
  // still receive the upload. Only its exact signed job may discard that orphan.
  app.post('/api/internal/documents/:id/discard', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const id = request.params.id;
    if (!UUID_RE.test(id)) return sendError(reply, 400, 'invalid_document_id');
    const provided = request.headers['x-arqvo-job-token'];
    if (typeof provided !== 'string') return sendError(reply, 403, 'invalid_job_token');
    try {
      const found = await pool.query('SELECT owner_uid, object_key FROM public.documents WHERE id=$1', [id]);
      if (!found.rowCount) return { discarded: true };
      const { owner_uid: owner, object_key: key } = found.rows[0];
      const expected = signDocumentJob(jobSigningSecret, owner, id, key);
      if (!validJobToken(expected, provided)) return sendError(reply, 403, 'invalid_job_token');
      await pool.query('DELETE FROM public.documents WHERE id=$1 AND owner_uid=$2 AND object_key=$3',
        [id, owner, key]);
      return { discarded: true };
    } catch (err) {
      request.log.error({ err }, 'Canceled upload discard failed');
      return sendError(reply, 503, 'documents_unavailable');
    }
  });

  // User corrections take precedence over future automated extraction runs.
  app.patch('/api/documents/:id/metadata', async (request, reply) => {
    const userId = await requireSession(request, reply);
    if (!userId || !requireOrigin(request, reply)) return;
    if (!UUID_RE.test(request.params.id)) return sendError(reply, 400, 'invalid_document_id');
    const body = request.body || {};
    if (typeof body.merchant !== 'string' || body.merchant.trim().length > 160 ||
        typeof body.category !== 'string' ||
        (body.category !== '' && !DOCUMENT_CATEGORIES.has(body.category)) ||
        typeof body.subcategory !== 'string' || body.subcategory.trim().length > 80) {
      return sendError(reply, 400, 'invalid_metadata');
    }
    const merchant = body.merchant.trim() || null;
    const category = body.category || null;
    const subcategory = category ? body.subcategory.trim() || null : null;
    try {
      const result = await pool.query(
        `UPDATE public.documents
         SET merchant=$3, category=$4, subcategory=$5,
             merchant_manual=true, category_manual=true,
             status=CASE WHEN
               (nullif(btrim($3::text),'') IS NOT NULL AND
                 (document_date IS NOT NULL OR amount_cents IS NOT NULL))
               OR (document_date IS NOT NULL AND amount_cents IS NOT NULL)
               THEN 'ready' ELSE 'uploaded' END,
             updated_at=now()
         WHERE owner_uid=$1 AND id=$2
         RETURNING id, original_filename AS "filename", mime_type AS "mimeType",
                   size_bytes AS "sizeBytes", status, merchant, category, subcategory,
                   document_date AS "documentDate", amount_cents AS "amountCents",
                   currency, created_at AS "createdAt"`,
        [userId, request.params.id, merchant, category, subcategory]
      );
      if (!result.rowCount) return sendError(reply, 404, 'document_not_found');
      return { document: result.rows[0] };
    } catch (err) {
      request.log.error({ err }, 'Document metadata review failed');
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


}
