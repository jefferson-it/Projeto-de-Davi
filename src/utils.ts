// ============= [ Utilitários ]

/**
 * Transforma o numero em texto BRL, como por exemplo 10 -> R$ 10,00 ou 5.4 -> R$ 5,40
 * 
 * @param {number | string} valor a ser transformado
 * 
 * @returns {string}
 */
export function toBRL(valor: number | string): string {
    return `R$ ${parseFloat((valor || 0).toString()).toFixed(2).replace(".", '.')}`;
}