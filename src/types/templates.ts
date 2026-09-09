export interface MessageTemplate {
  id: string
  tipo: 'WhatsApp' | 'E-mail'
  nome: string
  assunto?: string // Específico para E-mail
  conteudo: string
  descricao: string
  isDefault?: boolean
  updatedAt: string
}

export const TEMPLATE_VARIABLES: Array<{
  tag: string
  descricao: string
  exemplo: string
}> = [
  { tag: '[Nome]', descricao: 'Nome da arena', exemplo: 'Arena Sunset Beach' },
  { tag: '[Cidade]', descricao: 'Cidade da arena', exemplo: 'São Paulo' },
  { tag: '[Estado]', descricao: 'UF / Estado da arena', exemplo: 'SP' },
  { tag: '[Modalidade]', descricao: 'Modalidade esportiva principal', exemplo: 'Beach Tennis' },
  { tag: '[Endereco]', descricao: 'Endereço completo da arena', exemplo: 'Av. Paulista, 1000' },
]

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-whatsapp-padrao',
    tipo: 'WhatsApp',
    nome: 'Primeiro Contato (Apresentação)',
    descricao: 'Mensagem enviada automaticamente ao clicar no botão rápido de WhatsApp.',
    conteudo:
      'Olá! Vi a estrutura da [Nome] e gostaria de apresentar nosso sistema de gravação de jogadas. Com quem posso falar?',
    isDefault: true,
    updatedAt: new Date().toISOString(),
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

Desenvolvemos o sistema ArenaLead de gravação de jogadas e transmissão ao vivo em alta definição para arenas esportivas. Nossa solução permite:
- Gravação automática de lances e replays instantâneos para os atletas;
- Geração de receita extra para a arena com assinaturas e downloads de partidas;
- Aumento de visibilidade da [Nome] nas redes sociais dos clientes.

Gostaríamos de apresentar uma demonstração rápida de 10 minutos com dados de retorno sobre investimento.

Qual seria o melhor dia e horário para conversarmos?

Atenciosamente,
Equipe Comercial ArenaLead
(11) 99999-9999 | vendas@arenalead.com.br`,
    isDefault: true,
    updatedAt: new Date().toISOString(),
  },
]
