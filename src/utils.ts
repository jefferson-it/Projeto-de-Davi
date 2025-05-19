// ============= [ Importações ]
import { readFileSync, writeFileSync } from "fs";

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

export function saveBase64File(src: string, filename: string) {
    const base64Data = src.replace(/^data:image\/\w+;base64,/, '')

    try {
        writeFileSync(`./public/imagens/${filename}`, base64Data, 'base64')
        return true;
    } catch (e) {
        return false
    }
}

export function getPage(file: string) {
    const result = readFileSync(`./public/${file}.html`, 'utf-8');

    return result
}