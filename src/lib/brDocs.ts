/** Validação e formatação de documentos/endereço BR. */

export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '')
}

export function formatCpfCnpjInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatCepInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function allSameDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits)
}

export function isValidCpf(cpfRaw: string): boolean {
  const cpf = onlyDigits(cpfRaw)
  if (cpf.length !== 11 || allSameDigits(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === Number(cpf[10])
}

export function isValidCnpj(cnpjRaw: string): boolean {
  const cnpj = onlyDigits(cnpjRaw)
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false

  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + Number(base[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calc(cnpj, w1)
  const d2 = calc(cnpj, w2)
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13])
}

export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}

export function cpfCnpjErrorMessage(value: string): string | null {
  const digits = onlyDigits(value)
  if (!digits) return 'Informe o CPF ou CNPJ.'
  if (digits.length < 11) return 'CPF incompleto.'
  if (digits.length > 11 && digits.length < 14) return 'CNPJ incompleto.'
  if (digits.length === 11 && !isValidCpf(digits)) return 'CPF inválido. Verifique os dígitos.'
  if (digits.length === 14 && !isValidCnpj(digits)) return 'CNPJ inválido. Verifique os dígitos.'
  if (digits.length !== 11 && digits.length !== 14) return 'Informe um CPF (11) ou CNPJ (14 dígitos).'
  return null
}

export type ViaCepResult = {
  cep: string
  cidade: string
  estado: string
  bairro?: string
  logradouro?: string
}

export async function lookupCep(cepRaw: string): Promise<ViaCepResult> {
  const cep = onlyDigits(cepRaw)
  if (cep.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos.')
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!res.ok) throw new Error('Não foi possível consultar o CEP.')

  const data = (await res.json()) as {
    erro?: boolean
    cep?: string
    localidade?: string
    uf?: string
    bairro?: string
    logradouro?: string
  }

  if (data.erro || !data.localidade || !data.uf) {
    throw new Error('CEP não encontrado.')
  }

  return {
    cep,
    cidade: data.localidade,
    estado: data.uf,
    bairro: data.bairro,
    logradouro: data.logradouro,
  }
}
