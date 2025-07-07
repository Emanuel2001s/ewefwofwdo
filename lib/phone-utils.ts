/**
 * Utilitários para formatação de números de telefone
 */

const DDD_COM_NONO_DIGITO = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19", // SP
  "21", "22", "24", "27", "28", // RJ, ES
  "31", "32", "33", "34", "35", "37", "38", // MG
  "41", "42", "43", "44", "45", "46", "47", "48", "49", // PR, SC
  "51", "53", "54", "55", "51", // RS
  "61", // DF
  "62", "64", // GO
  "63", // TO
  "65", "66", // MT
  "67", // MS
  "68", // AC
  "69", // RO
  "71", "73", "74", "75", "77", // BA
  "79", // SE
  "81", "87", // PE
  "82", // AL
  "83", // PB
  "84", // RN
  "85", "88", // CE
  "86", "89", // PI
  "91", "93", "94", // PA
  "92", "97", // AM
  "95", // RR
  "96", // AP
  "98", "99", // MA
]

/**
 * Formata um número de telefone para o padrão brasileiro com código do país
 * Lida com diferentes formatos de entrada e adiciona o 9 quando necessário
 */
export function formatPhoneNumber(phone: string): string {
  // Remover todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '')
  
  // Remover o 0 inicial se houver
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Se já começar com 55, remover para padronizar o processo
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2)
  }

  // Agora temos apenas o DDD + número
  // Validar se tem pelo menos 10 dígitos (DDD + 8 dígitos)
  if (cleaned.length < 10) {
    throw new Error(`Número inválido: ${phone}. Deve ter no mínimo 10 dígitos (DDD + número)`)
  }

  const ddd = cleaned.substring(0, 2)
  let numero = cleaned.substring(2)

  // Se o DDD exige 9º dígito e o número tem apenas 8 dígitos, adicionar o 9
  if (DDD_COM_NONO_DIGITO.includes(ddd) && numero.length === 8) {
    numero = '9' + numero
  }

  // Se o número já tem 9 dígitos, verificar se começa com 9
  if (numero.length === 9 && !numero.startsWith('9')) {
    throw new Error(`Número inválido: ${phone}. Números celulares devem começar com 9`)
  }

  // Validar tamanho final do número (8 ou 9 dígitos após DDD)
  if (numero.length < 8 || numero.length > 9) {
    throw new Error(`Número inválido: ${phone}. Deve ter 8 dígitos (fixo) ou 9 dígitos (celular) após o DDD`)
  }

  // Adicionar código do país e retornar
  return '55' + ddd + numero
}

/**
 * Formata um número de telefone para exibição
 * Exemplo: 5511999999999 -> (11) 99999-9999
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // Remover código do país se presente
  const withoutCountry = cleaned.startsWith('55') ? cleaned.substring(2) : cleaned
  
  // Formatar de acordo com o tamanho
  if (withoutCountry.length === 11) { // Celular com 9
    return `(${withoutCountry.substring(0, 2)}) ${withoutCountry.substring(2, 7)}-${withoutCountry.substring(7)}`
  } else if (withoutCountry.length === 10) { // Fixo ou celular sem 9
    return `(${withoutCountry.substring(0, 2)}) ${withoutCountry.substring(2, 6)}-${withoutCountry.substring(6)}`
  }
  
  return withoutCountry // Retornar como está se não conseguir formatar
}

/**
 * Verifica se um número de telefone é válido
 */
export function isValidPhoneNumber(phone: string): boolean {
  try {
    formatPhoneNumber(phone)
    return true
  } catch {
    return false
  }
}

/**
 * Formata um número para o padrão da Evolution API (@s.whatsapp.net)
 */
export function formatPhoneNumberForEvolution(phone: string): string {
  const formatted = formatPhoneNumber(phone)
  return formatted + '@s.whatsapp.net'
} 