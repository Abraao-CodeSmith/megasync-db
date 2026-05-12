const { Storage } = require('megajs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const LOCAL_BACKUP_DIR = process.env.LOCAL_BACKUP_DIR || './backups';

async function performBackup() {
    if (!fs.existsSync(LOCAL_BACKUP_DIR)) fs.mkdirSync(LOCAL_BACKUP_DIR);

    const fileName = `backup_${DB_NAME}_${Date.now()}.bak`;
    const localPath = path.join(__dirname, LOCAL_BACKUP_DIR, fileName);

    console.log('--- Iniciando Backup SQL Server ---');

    const sqlCommand = `sqlcmd -S ${process.env.DB_INSTANCE} -E -Q "BACKUP DATABASE [${process.env.DB_NAME}] TO DISK='${localPath}' WITH FORMAT"`;

    exec(sqlCommand, async (error) => {
        if (error) {
            console.error(`Erro no SQL: ${error.message}`);
            return;
        }

        console.log('Arquivo gerado. Conectando ao Mega...');
        
        try {
            const storage = await new Storage({
                email: MEGA_EMAIL,
                password: MEGA_PASSWORD
            }).ready;

            // Busca os arquivos de forma mais robusta
            const files = await storage.root.children;
            const backupsAntigos = (files || []).filter(f => f.name && f.name.startsWith(`backup_${DB_NAME}`));
            
            for (const file of backupsAntigos) {
                console.log(`Removendo backup antigo: ${file.name}`);
                await file.delete(); 
            }

            console.log(`Subindo novo backup: ${fileName}`);
            const fileData = fs.readFileSync(localPath);
            await storage.upload(fileName, fileData).complete;

            console.log('Backup concluído e nuvem limpa!');
            fs.unlinkSync(localPath);

        } catch (err) {
            console.error('Erro na nuvem:', err);
        }
    });
}

// Agendamento: Segunda-feira e sexta-feira às 15:00h
cron.schedule('0 15 * * 1,5', () => {
  performBackup();
});

// Exporta para o Jest poder testar
module.exports = { performBackup };