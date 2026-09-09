import { Arena, HistoricoInteracao } from '../types/crm'

export const SEED_ARENAS: Arena[] = [
  {
    id: 'seed-arena-1',
    nome: 'Posto 021 Beach Tennis & Futevôlei',
    modalidade: 'Beach Tennis',
    whatsApp: '5521998877665',
    email: 'contato@posto021beach.com.br',
    endereco: 'Av. Lúcio Costa, 3400 - Barra da Tijuca',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    status: 'A Contatar',
    ultimoContato: null,
    observacoes:
      'Complexo com 6 quadras de areia cobertas e 4 descobertas. Torneios mensais aos finais de semana.',
    isSample: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'seed-arena-2',
    nome: 'PlayBall Society & Eventos',
    modalidade: 'Futebol Society',
    whatsApp: '5511987654321',
    email: 'gerencia@playballarena.com.br',
    endereco: 'Rua Nicolas Boer, 120 - Barra Funda',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'Contatado',
    ultimoContato: new Date(Date.now() - 2 * 86400000).toISOString(),
    observacoes:
      '8 campos society com grama sintética monofilamento. Interesse inicial em gravação automatizada de gols.',
    isSample: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'seed-arena-3',
    nome: 'Arena Sand Club Ibirapuera',
    modalidade: 'Beach Tennis',
    whatsApp: '5511976541234',
    email: 'adm@sandclubibira.com.br',
    endereco: 'Av. República do Líbano, 1100 - Moema',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'Em Negociação',
    ultimoContato: new Date(Date.now() - 1 * 86400000).toISOString(),
    observacoes:
      'Apresentada proposta do plano Pro com 4 câmeras AI e integração de replays via QR Code nos quiosques.',
    isSample: true,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'seed-arena-4',
    nome: 'Golaço Futebol & Resenha Society',
    modalidade: 'Futebol Society',
    whatsApp: '5531988882211',
    email: 'comercial@golacosociety.com.br',
    endereco: 'Av. Raja Gabaglia, 2200 - Estoril',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    status: 'Fechado / Cliente',
    ultimoContato: new Date(Date.now() - 3 * 86400000).toISOString(),
    observacoes:
      'Contrato assinado de 12 meses! Instalação dos totens e câmeras agendada para a próxima semana.',
    isSample: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'seed-arena-5',
    nome: 'Volley & Beach Arena Lagoa',
    modalidade: 'Vôlei',
    whatsApp: '5548991234567',
    email: 'contato@volleysandarena.com.br',
    endereco: 'Rod. Amaro Rocha Loures, 450 - Lagoa da Conceição',
    cidade: 'Florianópolis',
    estado: 'SC',
    status: 'Perdido',
    ultimoContato: new Date(Date.now() - 12 * 86400000).toISOString(),
    observacoes:
      'Optaram por reforma do piso antes de investir em tecnologia de filmagem. Retornar no 4º trimestre.',
    isSample: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'seed-arena-6',
    nome: 'Beach Point Alphaville',
    modalidade: 'Beach Tennis',
    whatsApp: '5511995544332',
    email: 'eventos@beachpointalpha.com.br',
    endereco: 'Alameda Araguaia, 1900 - Alphaville',
    cidade: 'Barueri',
    estado: 'SP',
    status: 'A Contatar',
    ultimoContato: null,
    observacoes:
      'Arena premium com lounge VIP e 8 quadras. Grande potencial para pacote de patrocínio de replays.',
    isSample: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
]

export const SEED_INTERACOES: HistoricoInteracao[] = [
  {
    id: 'seed-interacao-1',
    arenaId: 'seed-arena-2',
    tipo: 'WhatsApp',
    anotacao:
      'Mensagem de apresentação enviada para o gerente Marcos. Ele pediu para ligar no final da tarde.',
    dataRegistro: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'seed-interacao-2',
    arenaId: 'seed-arena-3',
    tipo: 'Ligação',
    anotacao:
      'Reunião de 30 minutos com a diretoria. Demonstramos o totem de replays automáticos e o app dos atletas.',
    dataRegistro: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'seed-interacao-3',
    arenaId: 'seed-arena-3',
    tipo: 'E-mail',
    anotacao:
      'Envio formal da proposta comercial customizada com os valores de assinatura mensal e instalação.',
    dataRegistro: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'seed-interacao-4',
    arenaId: 'seed-arena-4',
    tipo: 'WhatsApp',
    anotacao:
      'Confirmação do pagamento da taxa de ativação e envio dos dados cadastrais para emissão de NF.',
    dataRegistro: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'seed-interacao-5',
    arenaId: 'seed-arena-5',
    tipo: 'Ligação',
    anotacao:
      'Feedback do coordenador esportivo: adiaram compras para priorizar reforma estrutural da cobertura.',
    dataRegistro: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
]
