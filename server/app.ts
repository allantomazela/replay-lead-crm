import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq, and, desc } from 'drizzle-orm'
import { db } from './db'
import {
  arenas,
  interacoes,
  instaladores,
  messageTemplates,
  parceirosConvites,
  regioesParceiros,
  regioesSalvas,
  userPreferences,
} from './schema'
import { requireAuth, type AuthVariables } from './auth'
import { isValidCpfOrCnpj, onlyDigits as digitsOnly } from './brDocs'

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-whatsapp-padrao',
    tipo: 'WhatsApp',
    nome: 'Primeiro Contato (Apresentação)',
    descricao: 'Mensagem enviada automaticamente ao clicar no botão rápido de WhatsApp.',
    conteudo:
      'Olá! Vi a estrutura da [Nome] e gostaria de apresentar nosso sistema de gravação de jogadas. Com quem posso falar?',
    isDefault: true,
  },
  {
    id: 'tpl-whatsapp-pos-demo',
    tipo: 'WhatsApp',
    nome: 'Follow-up pós-demonstração',
    descricao:
      'Tom consultivo para demonstrar valor após apresentação da gravação de jogadas e propor fechamento.',
    conteudo:
      'Olá! Passando para agradecer pela demonstração na [Nome]. Viu como a gravação das jogadas valoriza a arena? Fico à disposição para fechar o plano ideal para [Cidade] — podemos conversar hoje?',
    isDefault: true,
  },
  {
    id: 'tpl-whatsapp-renovacao',
    tipo: 'WhatsApp',
    nome: 'Renovação de cliente',
    descricao:
      'Para arenas com status Fechado / Cliente, reforçando resultados e alinhando renovação da temporada.',
    conteudo:
      'Olá! Esperamos que as gravações estejam movimentando a [Nome]! Chegou o momento de renovarmos a parceria e liberarmos novos benefícios para a temporada. Podemos alinhar?',
    isDefault: true,
  },
  {
    id: 'tpl-email-padrao',
    tipo: 'E-mail',
    nome: 'Apresentação Comercial Completa',
    descricao: 'Proposta institucional de sistema de gravação de jogadas para arenas.',
    assunto: 'Sistema de Gravação de Jogadas para [Nome] ([Modalidade])',
    conteudo: `Olá equipe da [Nome],

Espero que estejam bem!

Acompanhamos a atuação da [Nome] em [Cidade]/[Estado] e sabemos da relevância da modalidade [Modalidade] para o público esportivo da região.

Desenvolvemos o sistema ReplayLead de gravação de jogadas e transmissão ao vivo em alta definição para arenas esportivas. Nossa solução permite:
- Gravação automática de lances e replays instantâneos para os atletas;
- Geração de receita extra para a arena com assinaturas e downloads de partidas;
- Aumento de visibilidade da [Nome] nas redes sociais dos clientes.

Gostaríamos de apresentar uma demonstração rápida de 10 minutos com dados de retorno sobre investimento.

Qual seria o melhor dia e horário para conversarmos?

Atenciosamente,
Equipe Comercial ReplayLead
(11) 99999-9999 | vendas@replaylead.com.br`,
    isDefault: true,
  },
]

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function mapArena(row: typeof arenas.$inferSelect) {
  return {
    id: row.id,
    nome: row.nome,
    modalidade: row.modalidade,
    whatsApp: row.whatsapp,
    email: row.email,
    endereco: row.endereco,
    cidade: row.cidade,
    estado: row.estado,
    status: row.status,
    ultimoContato: toIso(row.ultimoContato),
    observacoes: row.observacoes || undefined,
    isSample: row.isSample,
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
  }
}

function mapInteracao(row: typeof interacoes.$inferSelect) {
  return {
    id: row.id,
    arenaId: row.arenaId,
    tipo: row.tipo,
    anotacao: row.anotacao,
    dataRegistro: toIso(row.dataRegistro) || new Date().toISOString(),
  }
}

function mapRegiao(row: typeof regioesSalvas.$inferSelect) {
  return {
    id: row.id,
    nome: row.nome,
    cidade: row.cidade,
    estado: row.estado,
    modalidade: row.modalidade,
    criadoEm: toIso(row.criadoEm) || new Date().toISOString(),
    ultimaExecucaoEm: toIso(row.ultimaExecucaoEm),
    totalEncontradas: row.totalEncontradas,
    novasUltimaBusca: row.novasUltimaBusca,
    arenasIdsAnteriores: row.arenasIdsAnteriores || [],
  }
}

function mapTemplate(row: typeof messageTemplates.$inferSelect) {
  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    assunto: row.assunto || undefined,
    conteudo: row.conteudo,
    descricao: row.descricao,
    isDefault: row.isDefault,
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  }
}

export const app = new Hono<{ Variables: AuthVariables }>()

app.use(
  '*',
  cors({
    origin: [
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'https://www.sistemascuesta.com.br',
      'https://sistemascuesta.com.br',
      ...(process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : []),
    ],
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health' || c.req.path.startsWith('/api/public/')) {
    return next()
  }
  return requireAuth(c, next)
})

// ---- Arenas ----
app.get('/api/arenas', async (c) => {
  const userId = c.get('userId')
  const rows = await db.select().from(arenas).where(eq(arenas.userId, userId)).orderBy(desc(arenas.createdAt))
  return c.json(rows.map(mapArena))
})

app.post('/api/arenas', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = body.id || newId('arena')
  const now = new Date()
  const [row] = await db
    .insert(arenas)
    .values({
      id,
      userId,
      nome: body.nome,
      modalidade: body.modalidade || '',
      whatsapp: body.whatsApp || body.whatsapp || '',
      email: body.email || '',
      endereco: body.endereco || '',
      cidade: body.cidade || '',
      estado: body.estado || '',
      status: body.status || 'A Contatar',
      ultimoContato: body.ultimoContato ? new Date(body.ultimoContato) : null,
      observacoes: body.observacoes || null,
      isSample: Boolean(body.isSample),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return c.json(mapArena(row), 201)
})

app.post('/api/arenas/bulk', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const items = Array.isArray(body.items) ? body.items : []
  const now = new Date()
  if (items.length === 0) return c.json([])

  const values = items.map((item: Record<string, unknown>, index: number) => ({
    id: (item.id as string) || newId(`arena-${index}`),
    userId,
    nome: String(item.nome || ''),
    modalidade: String(item.modalidade || ''),
    whatsapp: String(item.whatsApp || item.whatsapp || ''),
    email: String(item.email || ''),
    endereco: String(item.endereco || ''),
    cidade: String(item.cidade || ''),
    estado: String(item.estado || ''),
    status: String(item.status || 'A Contatar'),
    ultimoContato: item.ultimoContato ? new Date(String(item.ultimoContato)) : null,
    observacoes: item.observacoes ? String(item.observacoes) : null,
    isSample: Boolean(item.isSample),
    createdAt: now,
    updatedAt: now,
  }))

  const rows = await db.insert(arenas).values(values).returning()
  return c.json(rows.map(mapArena), 201)
})

app.patch('/api/arenas/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const updates: Partial<typeof arenas.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.modalidade !== undefined) updates.modalidade = body.modalidade
  if (body.whatsApp !== undefined || body.whatsapp !== undefined) {
    updates.whatsapp = body.whatsApp ?? body.whatsapp
  }
  if (body.email !== undefined) updates.email = body.email
  if (body.endereco !== undefined) updates.endereco = body.endereco
  if (body.cidade !== undefined) updates.cidade = body.cidade
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.status !== undefined) updates.status = body.status
  if (body.ultimoContato !== undefined) {
    updates.ultimoContato = body.ultimoContato ? new Date(body.ultimoContato) : null
  }
  if (body.observacoes !== undefined) updates.observacoes = body.observacoes
  if (body.isSample !== undefined) updates.isSample = Boolean(body.isSample)

  const rows = await db
    .update(arenas)
    .set(updates)
    .where(and(eq(arenas.id, id), eq(arenas.userId, userId)))
    .returning()

  if (!rows[0]) return c.json({ error: 'Arena não encontrada' }, 404)
  return c.json(mapArena(rows[0]))
})

app.delete('/api/arenas/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  await db.delete(interacoes).where(and(eq(interacoes.arenaId, id), eq(interacoes.userId, userId)))
  const rows = await db
    .delete(arenas)
    .where(and(eq(arenas.id, id), eq(arenas.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Arena não encontrada' }, 404)
  return c.json({ ok: true })
})

// ---- Interações ----
app.get('/api/interacoes', async (c) => {
  const userId = c.get('userId')
  const arenaId = c.req.query('arenaId')
  const rows = arenaId
    ? await db
        .select()
        .from(interacoes)
        .where(and(eq(interacoes.userId, userId), eq(interacoes.arenaId, arenaId)))
        .orderBy(desc(interacoes.dataRegistro))
    : await db
        .select()
        .from(interacoes)
        .where(eq(interacoes.userId, userId))
        .orderBy(desc(interacoes.dataRegistro))
  return c.json(rows.map(mapInteracao))
})

app.post('/api/interacoes', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = body.id || newId('interacao')
  const dataRegistro = body.dataRegistro ? new Date(body.dataRegistro) : new Date()

  const arena = await db
    .select()
    .from(arenas)
    .where(and(eq(arenas.id, body.arenaId), eq(arenas.userId, userId)))
    .limit(1)
  if (!arena[0]) return c.json({ error: 'Arena não encontrada' }, 404)

  const [row] = await db
    .insert(interacoes)
    .values({
      id,
      userId,
      arenaId: body.arenaId,
      tipo: body.tipo,
      anotacao: body.anotacao || '',
      dataRegistro,
    })
    .returning()

  await db
    .update(arenas)
    .set({ ultimoContato: dataRegistro, updatedAt: new Date() })
    .where(and(eq(arenas.id, body.arenaId), eq(arenas.userId, userId)))

  return c.json(mapInteracao(row), 201)
})

// ---- Regiões ----
app.get('/api/regioes', async (c) => {
  const userId = c.get('userId')
  const rows = await db
    .select()
    .from(regioesSalvas)
    .where(eq(regioesSalvas.userId, userId))
    .orderBy(desc(regioesSalvas.criadoEm))
  return c.json(rows.map(mapRegiao))
})

app.post('/api/regioes', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = body.id || newId('regiao')
  const [row] = await db
    .insert(regioesSalvas)
    .values({
      id,
      userId,
      nome: body.nome,
      cidade: body.cidade,
      estado: body.estado,
      modalidade: body.modalidade,
      criadoEm: new Date(),
      ultimaExecucaoEm: body.ultimaExecucaoEm ? new Date(body.ultimaExecucaoEm) : null,
      totalEncontradas: body.totalEncontradas ?? 0,
      novasUltimaBusca: body.novasUltimaBusca ?? 0,
      arenasIdsAnteriores: body.arenasIdsAnteriores || [],
    })
    .returning()
  return c.json(mapRegiao(row), 201)
})

app.patch('/api/regioes/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: Partial<typeof regioesSalvas.$inferInsert> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.cidade !== undefined) updates.cidade = body.cidade
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.modalidade !== undefined) updates.modalidade = body.modalidade
  if (body.ultimaExecucaoEm !== undefined) {
    updates.ultimaExecucaoEm = body.ultimaExecucaoEm ? new Date(body.ultimaExecucaoEm) : null
  }
  if (body.totalEncontradas !== undefined) updates.totalEncontradas = body.totalEncontradas
  if (body.novasUltimaBusca !== undefined) updates.novasUltimaBusca = body.novasUltimaBusca
  if (body.arenasIdsAnteriores !== undefined) updates.arenasIdsAnteriores = body.arenasIdsAnteriores

  const rows = await db
    .update(regioesSalvas)
    .set(updates)
    .where(and(eq(regioesSalvas.id, id), eq(regioesSalvas.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Região não encontrada' }, 404)
  return c.json(mapRegiao(rows[0]))
})

app.delete('/api/regioes/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const rows = await db
    .delete(regioesSalvas)
    .where(and(eq(regioesSalvas.id, id), eq(regioesSalvas.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Região não encontrada' }, 404)
  return c.json({ ok: true })
})

// ---- Templates ----
async function ensureDefaultTemplates(userId: string) {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.userId, userId))
  if (existing.length > 0) return existing

  const now = new Date()
  const values = DEFAULT_TEMPLATES.map((tpl) => ({
    id: `${tpl.id}-${userId.slice(0, 8)}`,
    userId,
    tipo: tpl.tipo,
    nome: tpl.nome,
    assunto: tpl.assunto || null,
    conteudo: tpl.conteudo,
    descricao: tpl.descricao,
    isDefault: true,
    updatedAt: now,
  }))
  return db.insert(messageTemplates).values(values).returning()
}

app.get('/api/templates', async (c) => {
  const userId = c.get('userId')
  const rows = await ensureDefaultTemplates(userId)
  return c.json(rows.map(mapTemplate))
})

app.patch('/api/templates/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: Partial<typeof messageTemplates.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.assunto !== undefined) updates.assunto = body.assunto
  if (body.conteudo !== undefined) updates.conteudo = body.conteudo
  if (body.descricao !== undefined) updates.descricao = body.descricao
  if (body.tipo !== undefined) updates.tipo = body.tipo

  const rows = await db
    .update(messageTemplates)
    .set(updates)
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Template não encontrado' }, 404)
  return c.json(mapTemplate(rows[0]))
})

app.post('/api/templates/reset', async (c) => {
  const userId = c.get('userId')
  await db.delete(messageTemplates).where(eq(messageTemplates.userId, userId))
  const rows = await ensureDefaultTemplates(userId)
  return c.json(rows.map(mapTemplate))
})

app.post('/api/templates/:id/reset', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const current = await db
    .select()
    .from(messageTemplates)
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
    .limit(1)
  if (!current[0]) return c.json({ error: 'Template não encontrado' }, 404)

  const baseKey = DEFAULT_TEMPLATES.find(
    (t) => id.startsWith(t.id) || current[0].nome === t.nome || current[0].tipo === t.tipo,
  )
  const def =
    DEFAULT_TEMPLATES.find((t) => id.startsWith(t.id)) ||
    DEFAULT_TEMPLATES.find((t) => t.nome === current[0].nome) ||
    baseKey

  if (!def) return c.json({ error: 'Template padrão não encontrado' }, 404)

  const rows = await db
    .update(messageTemplates)
    .set({
      nome: def.nome,
      assunto: def.assunto || null,
      conteudo: def.conteudo,
      descricao: def.descricao,
      updatedAt: new Date(),
    })
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
    .returning()

  return c.json(mapTemplate(rows[0]))
})

// ---- Preferences ----
app.get('/api/preferences', async (c) => {
  const userId = c.get('userId')
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
  if (!rows[0]) {
    return c.json({ followUpDays: 7, dismissedAlerts: {} })
  }
  return c.json({
    followUpDays: rows[0].followupDays,
    dismissedAlerts: rows[0].dismissedAlerts || {},
  })
})

app.put('/api/preferences', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const followupDays = [7, 14, 30].includes(body.followUpDays) ? body.followUpDays : 7
  const dismissedAlerts =
    body.dismissedAlerts && typeof body.dismissedAlerts === 'object' ? body.dismissedAlerts : {}

  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  if (existing[0]) {
    const [row] = await db
      .update(userPreferences)
      .set({
        followupDays,
        dismissedAlerts,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId))
      .returning()
    return c.json({
      followUpDays: row.followupDays,
      dismissedAlerts: row.dismissedAlerts || {},
    })
  }

  const [row] = await db
    .insert(userPreferences)
    .values({
      userId,
      followupDays,
      dismissedAlerts,
      updatedAt: new Date(),
    })
    .returning()

  return c.json({
    followUpDays: row.followupDays,
    dismissedAlerts: row.dismissedAlerts || {},
  })
})

function mapInstalador(row: typeof instaladores.$inferSelect) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    whatsApp: row.whatsapp,
    telefone: row.telefone || '',
    email: row.email,
    website: row.website || '',
    cpfCnpj: row.cpfCnpj || '',
    cep: row.cep || '',
    endereco: row.endereco,
    cidade: row.cidade,
    estado: row.estado,
    regioesAtendimento: row.regioesAtendimento || [],
    observacoes: row.observacoes || undefined,
    status: row.status,
    origem: row.origem,
    isSample: row.isSample,
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
  }
}

function onlyDigits(value: unknown): string {
  return digitsOnly(value)
}

function parseCidadesAtendimento(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((c) => String(c).trim()).filter(Boolean)
  }
  return String(raw || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 8)
}

function mapRegiaoParceiro(row: typeof regioesParceiros.$inferSelect) {
  return {
    id: row.id,
    nome: row.nome,
    cidade: row.cidade,
    estado: row.estado,
    tipo: row.tipo,
    criadoEm: toIso(row.criadoEm) || new Date().toISOString(),
    ultimaExecucaoEm: toIso(row.ultimaExecucaoEm),
    totalEncontradas: row.totalEncontradas,
    novasUltimaBusca: row.novasUltimaBusca,
    idsAnteriores: row.idsAnteriores || [],
  }
}

// ---- Instaladores / Parceiros ----
app.get('/api/instaladores', async (c) => {
  const userId = c.get('userId')
  const cidade = c.req.query('cidade')
  const estado = c.req.query('estado')
  const tipo = c.req.query('tipo')
  const q = (c.req.query('q') || '').trim().toLowerCase()

  let rows = await db
    .select()
    .from(instaladores)
    .where(eq(instaladores.userId, userId))
    .orderBy(desc(instaladores.createdAt))

  if (cidade) {
    const cidadeLower = cidade.toLowerCase()
    rows = rows.filter((r) => r.cidade.toLowerCase().includes(cidadeLower))
  }
  if (estado) {
    const uf = estado.toUpperCase()
    rows = rows.filter((r) => r.estado.toUpperCase() === uf)
  }
  if (tipo && tipo !== 'Todos') {
    rows = rows.filter((r) => r.tipo === tipo)
  }
  if (q) {
    rows = rows.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        r.cidade.toLowerCase().includes(q) ||
        (r.regioesAtendimento || []).some((cdd) => cdd.toLowerCase().includes(q)),
    )
  }

  return c.json(rows.map(mapInstalador))
})

app.post('/api/instaladores', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = body.id || newId('instalador')
  const now = new Date()
  const [row] = await db
    .insert(instaladores)
    .values({
      id,
      userId,
      nome: body.nome,
      tipo: body.tipo || 'Instalador de Câmeras / CFTV',
      whatsapp: body.whatsApp || body.whatsapp || '',
      telefone: body.telefone || '',
      email: body.email || '',
      website: body.website || '',
      cpfCnpj: onlyDigits(body.cpfCnpj || body.cpf_cnpj || ''),
      cep: onlyDigits(body.cep || ''),
      endereco: body.endereco || '',
      cidade: body.cidade || '',
      estado: body.estado || '',
      regioesAtendimento: Array.isArray(body.regioesAtendimento)
        ? body.regioesAtendimento
        : body.cidade
          ? [body.cidade]
          : [],
      observacoes: body.observacoes || null,
      status: body.status || 'A Contatar',
      origem: body.origem || 'manual',
      isSample: Boolean(body.isSample),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return c.json(mapInstalador(row), 201)
})

app.post('/api/instaladores/bulk', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const items = Array.isArray(body.items) ? body.items : []
  const now = new Date()
  if (items.length === 0) return c.json([])

  const values = items.map((item: Record<string, unknown>, index: number) => ({
    id: (item.id as string) || newId(`instalador-${index}`),
    userId,
    nome: String(item.nome || ''),
    tipo: String(item.tipo || 'Instalador de Câmeras / CFTV'),
    whatsapp: String(item.whatsApp || item.whatsapp || ''),
    telefone: String(item.telefone || ''),
    email: String(item.email || ''),
    website: String(item.website || ''),
    cpfCnpj: onlyDigits(item.cpfCnpj || item.cpf_cnpj || ''),
    cep: onlyDigits(item.cep || ''),
    endereco: String(item.endereco || ''),
    cidade: String(item.cidade || ''),
    estado: String(item.estado || ''),
    regioesAtendimento: Array.isArray(item.regioesAtendimento)
      ? (item.regioesAtendimento as string[])
      : item.cidade
        ? [String(item.cidade)]
        : [],
    observacoes: item.observacoes ? String(item.observacoes) : null,
    status: String(item.status || 'A Contatar'),
    origem: String(item.origem || 'osm'),
    isSample: Boolean(item.isSample),
    createdAt: now,
    updatedAt: now,
  }))

  const rows = await db.insert(instaladores).values(values).returning()
  return c.json(rows.map(mapInstalador), 201)
})

app.patch('/api/instaladores/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: Partial<typeof instaladores.$inferInsert> = { updatedAt: new Date() }

  if (body.nome !== undefined) updates.nome = body.nome
  if (body.tipo !== undefined) updates.tipo = body.tipo
  if (body.whatsApp !== undefined || body.whatsapp !== undefined) {
    updates.whatsapp = body.whatsApp ?? body.whatsapp
  }
  if (body.telefone !== undefined) updates.telefone = body.telefone
  if (body.email !== undefined) updates.email = body.email
  if (body.website !== undefined) updates.website = body.website
  if (body.cpfCnpj !== undefined || body.cpf_cnpj !== undefined) {
    updates.cpfCnpj = onlyDigits(body.cpfCnpj ?? body.cpf_cnpj)
  }
  if (body.cep !== undefined) updates.cep = onlyDigits(body.cep)
  if (body.endereco !== undefined) updates.endereco = body.endereco
  if (body.cidade !== undefined) updates.cidade = body.cidade
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.regioesAtendimento !== undefined) updates.regioesAtendimento = body.regioesAtendimento
  if (body.observacoes !== undefined) updates.observacoes = body.observacoes
  if (body.status !== undefined) updates.status = body.status
  if (body.origem !== undefined) updates.origem = body.origem

  const rows = await db
    .update(instaladores)
    .set(updates)
    .where(and(eq(instaladores.id, id), eq(instaladores.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Parceiro não encontrado' }, 404)
  return c.json(mapInstalador(rows[0]))
})

app.delete('/api/instaladores/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const rows = await db
    .delete(instaladores)
    .where(and(eq(instaladores.id, id), eq(instaladores.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Parceiro não encontrado' }, 404)
  return c.json({ ok: true })
})

app.get('/api/regioes-parceiros', async (c) => {
  const userId = c.get('userId')
  const rows = await db
    .select()
    .from(regioesParceiros)
    .where(eq(regioesParceiros.userId, userId))
    .orderBy(desc(regioesParceiros.criadoEm))
  return c.json(rows.map(mapRegiaoParceiro))
})

app.post('/api/regioes-parceiros', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = body.id || newId('regiao-parceiro')
  const [row] = await db
    .insert(regioesParceiros)
    .values({
      id,
      userId,
      nome: body.nome,
      cidade: body.cidade,
      estado: body.estado,
      tipo: body.tipo || 'Todos',
      criadoEm: new Date(),
      ultimaExecucaoEm: body.ultimaExecucaoEm ? new Date(body.ultimaExecucaoEm) : null,
      totalEncontradas: body.totalEncontradas ?? 0,
      novasUltimaBusca: body.novasUltimaBusca ?? 0,
      idsAnteriores: body.idsAnteriores || [],
    })
    .returning()
  return c.json(mapRegiaoParceiro(row), 201)
})

app.patch('/api/regioes-parceiros/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: Partial<typeof regioesParceiros.$inferInsert> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.cidade !== undefined) updates.cidade = body.cidade
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.tipo !== undefined) updates.tipo = body.tipo
  if (body.ultimaExecucaoEm !== undefined) {
    updates.ultimaExecucaoEm = body.ultimaExecucaoEm ? new Date(body.ultimaExecucaoEm) : null
  }
  if (body.totalEncontradas !== undefined) updates.totalEncontradas = body.totalEncontradas
  if (body.novasUltimaBusca !== undefined) updates.novasUltimaBusca = body.novasUltimaBusca
  if (body.idsAnteriores !== undefined) updates.idsAnteriores = body.idsAnteriores

  const rows = await db
    .update(regioesParceiros)
    .set(updates)
    .where(and(eq(regioesParceiros.id, id), eq(regioesParceiros.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Região não encontrada' }, 404)
  return c.json(mapRegiaoParceiro(rows[0]))
})

app.delete('/api/regioes-parceiros/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const rows = await db
    .delete(regioesParceiros)
    .where(and(eq(regioesParceiros.id, id), eq(regioesParceiros.userId, userId)))
    .returning()
  if (!rows[0]) return c.json({ error: 'Região não encontrada' }, 404)
  return c.json({ ok: true })
})

// ---- Convite público de parceiros ----
app.get('/api/parceiros/convite', async (c) => {
  const userId = c.get('userId')
  const existing = await db
    .select()
    .from(parceirosConvites)
    .where(eq(parceirosConvites.userId, userId))
    .limit(1)

  let row = existing[0]
  if (!row) {
    const [created] = await db
      .insert(parceirosConvites)
      .values({
        id: newId('convite'),
        userId,
        codigo: makeInviteCode(),
        ativo: true,
        createdAt: new Date(),
      })
      .returning()
    row = created
  } else if (!row.ativo) {
    const [updated] = await db
      .update(parceirosConvites)
      .set({ ativo: true })
      .where(eq(parceirosConvites.id, row.id))
      .returning()
    row = updated
  }

  const origin = process.env.APP_ORIGIN || 'https://www.sistemascuesta.com.br'
  const path = `/parceiros/inscricao/${row.codigo}`
  return c.json({
    codigo: row.codigo,
    ativo: row.ativo,
    path,
    url: `${origin.replace(/\/$/, '')}${path}`,
  })
})

app.get('/api/public/parceiros-convite/:codigo', async (c) => {
  const codigo = c.req.param('codigo').trim().toLowerCase()
  const rows = await db
    .select()
    .from(parceirosConvites)
    .where(eq(parceirosConvites.codigo, codigo))
    .limit(1)
  const row = rows[0]
  if (!row || !row.ativo) {
    return c.json({ error: 'Link de inscrição inválido ou desativado.' }, 404)
  }
  return c.json({ ok: true, codigo: row.codigo })
})

app.post('/api/public/parceiros-inscricao', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const codigo = String(body.codigo || '').trim().toLowerCase()
  const nome = String(body.nome || '').trim()
  const cpfCnpj = onlyDigits(body.cpfCnpj || body.cpf_cnpj)
  const cep = onlyDigits(body.cep)
  const whatsapp = onlyDigits(body.whatsApp || body.whatsapp)
  const telefone = onlyDigits(body.telefone)
  const email = String(body.email || '').trim()
  const website = String(body.website || body.site || '').trim()
  const cidade = String(body.cidade || '').trim()
  const estado = String(body.estado || '').trim().toUpperCase()
  const regioesAtendimento = parseCidadesAtendimento(body.regioesAtendimento || body.cidades)
  const tipo = String(body.tipo || 'Instalador de Câmeras / CFTV')

  if (!codigo) return c.json({ error: 'Código do convite obrigatório.' }, 400)
  if (!nome) return c.json({ error: 'Informe o nome completo.' }, 400)
  if (!isValidCpfOrCnpj(cpfCnpj)) {
    return c.json({ error: 'CPF ou CNPJ inválido. Verifique os dígitos.' }, 400)
  }
  if (cep.length !== 8) {
    return c.json({ error: 'Informe um CEP válido com 8 dígitos.' }, 400)
  }
  if (!cidade) {
    return c.json({ error: 'Informe a cidade de residência (via CEP).' }, 400)
  }
  if (!whatsapp || whatsapp.length < 10) {
    return c.json({ error: 'Informe um WhatsApp válido.' }, 400)
  }
  if (regioesAtendimento.length === 0) {
    return c.json({ error: 'Informe ao menos uma cidade de atendimento.' }, 400)
  }

  const convites = await db
    .select()
    .from(parceirosConvites)
    .where(eq(parceirosConvites.codigo, codigo))
    .limit(1)
  const convite = convites[0]
  if (!convite || !convite.ativo) {
    return c.json({ error: 'Link de inscrição inválido ou desativado.' }, 404)
  }

  const now = new Date()
  const [row] = await db
    .insert(instaladores)
    .values({
      id: newId('instalador'),
      userId: convite.userId,
      nome,
      tipo,
      whatsapp: whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp,
      telefone: telefone
        ? telefone.length <= 11
          ? `55${telefone}`
          : telefone
        : '',
      email,
      website,
      cpfCnpj,
      cep,
      endereco: '',
      cidade,
      estado,
      regioesAtendimento,
      observacoes: 'Cadastro via formulário público de parceria.',
      status: 'A Contatar',
      origem: 'formulario',
      isSample: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return c.json({ ok: true, id: row.id, nome: row.nome }, 201)
})
