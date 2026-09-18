/** Validação de CPF/CNPJ no servidor (mesma regra do frontend). */

export function onlyDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
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
  return calc(cnpj, w1) === Number(cnpj[12]) && calc(cnpj, w2) === Number(cnpj[13])
}

export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}
