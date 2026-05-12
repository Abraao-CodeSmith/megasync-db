const { Storage } = require('megajs');
const fs = require('fs');
require('dotenv').config();

async function backupManual() {
    try {
        const storage = await new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        }).ready;

        console.log("Conectado! Criando pasta de segurança...");
        
        // 1. Cria a pasta (ou obtém se já existir)
        const pastaNome = "BACKUP_MANUAL_SEGURANCA";
        let pasta = storage.root.children.find(f => f.name === pastaNome && f.directory);
        
        if (!pasta) {
            pasta = await storage.mkdir(pastaNome);
            console.log(`Pasta '${pastaNome}' criada.`);
        }

        // 2. Sobe o arquivo para dentro dessa pasta
        console.log("Subindo arquivo...");
        const fileData = fs.readFileSync('C:\\backup_manual_seguranca.bak');
        
        await storage.upload({
            name: `manual_backup_${Date.now()}.bak`,
            target: pasta // Define que o destino é a pasta que criamos
        }, fileData).complete;

        console.log("✅ Backup manual concluído com sucesso na pasta específica!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro no backup manual:", err.message);
        process.exit(1);
    }
}

backupManual();