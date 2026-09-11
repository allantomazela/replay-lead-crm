# ReplayLead CRM

Plataforma comercial para prospecção e vendas de sistemas de gravação de jogadas para arenas esportivas.

## Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## Pré-requisitos

- Node.js 18+
- pnpm (recomendado)

## Configuração de ambiente

1. Copie `.env.example` para `.env-dev` e preencha `DATABASE_URL` (somente servidor).
2. `VITE_NEON_AUTH_URL` fica em `.env.development` (URL pública do Neon Auth).
3. Nunca exponha `DATABASE_URL` com prefixo `VITE_`.

## Instalação

```bash
pnpm install
```

## Scripts Disponíveis

### Desenvolvimento (frontend + API)

```bash
pnpm dev
```

- Web: [http://localhost:8080](http://localhost:8080)
- API: [http://localhost:3001](http://localhost:3001)

Rotas públicas: `/login`, `/cadastro` (e-mail/senha e Google via Neon Auth).
CRM protegido por sessão.

### Build

```bash
pnpm build
pnpm build:dev
```

### Preview

```bash
pnpm preview
```

### Linting e Formatação

```bash
pnpm lint
pnpm lint:fix
pnpm format
```

## Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```
