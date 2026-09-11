import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const arenas = pgTable('arenas', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  nome: text('nome').notNull(),
  modalidade: text('modalidade').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  email: text('email').notNull().default(''),
  endereco: text('endereco').notNull().default(''),
  cidade: text('cidade').notNull().default(''),
  estado: text('estado').notNull().default(''),
  status: text('status').notNull().default('A Contatar'),
  ultimoContato: timestamp('ultimo_contato', { withTimezone: true }),
  observacoes: text('observacoes'),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const interacoes = pgTable('interacoes', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  arenaId: text('arena_id').notNull(),
  tipo: text('tipo').notNull(),
  anotacao: text('anotacao').notNull().default(''),
  dataRegistro: timestamp('data_registro', { withTimezone: true }).notNull().defaultNow(),
})

export const regioesSalvas = pgTable('regioes_salvas', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  nome: text('nome').notNull(),
  cidade: text('cidade').notNull(),
  estado: text('estado').notNull(),
  modalidade: text('modalidade').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  ultimaExecucaoEm: timestamp('ultima_execucao_em', { withTimezone: true }),
  totalEncontradas: integer('total_encontradas').notNull().default(0),
  novasUltimaBusca: integer('novas_ultima_busca').notNull().default(0),
  arenasIdsAnteriores: jsonb('arenas_ids_anteriores').$type<string[]>().notNull().default([]),
})

export const messageTemplates = pgTable('message_templates', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  tipo: text('tipo').notNull(),
  nome: text('nome').notNull(),
  assunto: text('assunto'),
  conteudo: text('conteudo').notNull(),
  descricao: text('descricao').notNull().default(''),
  isDefault: boolean('is_default').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey(),
  followupDays: integer('followup_days').notNull().default(7),
  dismissedAlerts: jsonb('dismissed_alerts').$type<Record<string, string>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
