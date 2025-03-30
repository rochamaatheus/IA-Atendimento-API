/**
 * Normaliza telefones brasileiros para o formato:
 * +55 (DD) 9 XXXX-XXXX
 *
 * Suporta formatos como:
 * - 4799999999
 * - 999999999
 * - (47)99999-9999
 * - +55 (47) 99999-9999
 * - com ou sem o nono dígito
 */
export function normalizarTelefone(telefone) {
  if (!telefone) return '';

  // Remove tudo que não for número
  const numeros = telefone.replace(/\D/g, '');

  // Se vier com 13 dígitos (ex: +5547999999999)
  if (numeros.length === 13 && numeros.startsWith('55')) {
    const ddd = numeros.slice(2, 4);
    const parte1 = numeros.slice(4, 5); // 9 ou 8 etc.
    const parte2 = numeros.slice(5, 9);
    const parte3 = numeros.slice(9);
    return `+55 (${ddd}) ${parte1} ${parte2}-${parte3}`;
  }

  // Se vier com 11 dígitos (ex: 47999999999)
  if (numeros.length === 11) {
    const ddd = numeros.slice(0, 2);
    const parte1 = numeros.slice(2, 3);
    const parte2 = numeros.slice(3, 7);
    const parte3 = numeros.slice(7);
    return `+55 (${ddd}) ${parte1} ${parte2}-${parte3}`;
  }

  // Se vier com 10 dígitos (sem o nono dígito)
  if (numeros.length === 10) {
    const ddd = numeros.slice(0, 2);
    const parte1 = '9'; // adiciona o nono dígito padrão
    const parte2 = numeros.slice(2, 6);
    const parte3 = numeros.slice(6);
    return `+55 (${ddd}) ${parte1} ${parte2}-${parte3}`;
  }

  // Fallback: retorna o que veio (já formatado ou inválido)
  return telefone;
}
