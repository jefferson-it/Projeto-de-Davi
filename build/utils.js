"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBRL = toBRL;
exports.saveBase64File = saveBase64File;
exports.getPage = getPage;
// ============= [ Importações ]
const fs_1 = require("fs");
// ============= [ Utilitários ]
/**
 * Transforma o numero em texto BRL, como por exemplo 10 -> R$ 10,00 ou 5.4 -> R$ 5,40
 *
 * @param {number | string} valor a ser transformado
 *
 * @returns {string}
 */
function toBRL(valor) {
    return `R$ ${parseFloat((valor || 0).toString()).toFixed(2).replace(".", '.')}`;
}
function saveBase64File(src, filename) {
    const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
    try {
        (0, fs_1.writeFileSync)(`./public/imagens/${filename}`, base64Data, 'base64');
        return true;
    }
    catch (e) {
        return false;
    }
}
function getPage(file) {
    const result = (0, fs_1.readFileSync)(`./public/${file}.html`, 'utf-8');
    return result;
}
