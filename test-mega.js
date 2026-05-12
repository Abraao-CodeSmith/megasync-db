const { Storage } = require('megajs');
require('dotenv').config();

async function testConnection() {
    console.log("Tentando conectar ao Mega.nz...");
    try {
        const storage = await new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        }).ready;

        console.log("✅ Conexão estabelecida com sucesso!");

        // Tentativa 1: Acessar a lista de arquivos via storage.root.children
        // No megajs moderno, root é um objeto que contém o array children
        const files = storage.root.children;

        if (files && Array.isArray(files)) {
            console.log(`Arquivos encontrados na conta: ${files.length}`);
            files.slice(0, 3).forEach(f => console.log(` - ${f.name}`));
        } else {
            console.log("A conexão foi feita, mas a lista de arquivos retornou vazia ou em formato inesperado.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro ao tentar ler os arquivos:");
        console.error(err.message);
        process.exit(1);
    }
}

testConnection();