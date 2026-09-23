const { Storage } = require('megajs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

/**
 * Extrai o timestamp numérico de um nome de arquivo no formato `backup_${DB_NAME}_${timestamp}.bak`.
 * Exemplo: `backup_MeuBanco_1727100000000.bak` -> 1727100000000
 * Retorna 0 se o padrão não for encontrado.
 */
function extractTimestamp(fileName) {
    if (!fileName) return 0;
    const match = fileName.match(/_(\d+)\.bak$/);
    return match ? parseInt(match[1], 10) : 0;
}

async function performBackup() {
    const dbName = process.env.DB_NAME;
    const dbInstance = process.env.DB_INSTANCE;
    const megaEmail = process.env.MEGA_EMAIL;
    const megaPassword = process.env.MEGA_PASSWORD;
    const localDirSetting = process.env.LOCAL_BACKUP_DIR || './backups';

    const localBackupDir = path.isAbsolute(localDirSetting) 
        ? localDirSetting 
        : path.join(__dirname, localDirSetting);

    if (!fs.existsSync(localBackupDir)) {
        fs.mkdirSync(localBackupDir, { recursive: true });
    }

    const fileName = `backup_${dbName}_${Date.now()}.bak`;
    const localPath = path.join(localBackupDir, fileName);

    console.log('--- Iniciando Backup SQL Server ---');

    const sqlCommand = `sqlcmd -S ${dbInstance} -E -Q "BACKUP DATABASE [${dbName}] TO DISK='${localPath}' WITH FORMAT"`;

    try {
        // 1. Executa o backup local no SQL Server via comando sqlcmd
        await new Promise((resolve, reject) => {
            exec(sqlCommand, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Erro no SQL Server: ${error.message}`));
                }
                resolve({ stdout, stderr });
            });
        });

        console.log('Arquivo gerado com sucesso. Conectando ao Mega.nz...');

        // 2. Conecta ao Mega.nz
        const storage = await new Storage({
            email: megaEmail,
            password: megaPassword
        }).ready;

        // 3. Política de Retenção: Mantém os 3 backups mais recentes no Mega.nz
        const files = (await storage.root.children) || [];
        const prefixoBackup = `backup_${dbName}`;
        const backupsAntigos = files.filter(f => f.name && f.name.startsWith(prefixoBackup));

        // Ordena por data (timestamp decrescente: do mais recente para o mais antigo)
        const sortedBackups = backupsAntigos.sort((a, b) => {
            const timeA = extractTimestamp(a.name);
            const timeB = extractTimestamp(b.name);
            return timeB - timeA;
        });

        // Mantém 2 backups existentes para que, após o upload do novo, o total no Mega.nz seja exatamente 3 backups
        const MAX_BACKUPS = 3;
        const MAX_EXISTING_TO_KEEP = MAX_BACKUPS - 1; // 2
        const backupsExcedentes = sortedBackups.slice(MAX_EXISTING_TO_KEEP);

        for (const file of backupsExcedentes) {
            console.log(`Removendo backup antigo excedente do Mega: ${file.name}`);
            try {
                await file.delete();
            } catch (deleteError) {
                console.error(`Erro ao deletar arquivo antigo (${file.name}):`, deleteError.message || deleteError);
            }
        }

        // 4. Upload do novo arquivo de backup para o Mega.nz
        console.log(`Subindo novo backup: ${fileName}`);
        const fileData = fs.readFileSync(localPath);
        await storage.upload(fileName, fileData).complete;

        console.log('✅ Backup concluído e nuvem sincronizada!');

    } catch (err) {
        console.error('❌ Erro durante o processo de backup:', err.message || err);
    } finally {
        // 5. Garantia de limpeza do arquivo temporário local (sucesso ou falha)
        if (fs.existsSync(localPath)) {
            try {
                fs.unlinkSync(localPath);
                console.log(`Arquivo temporário local limpo: ${localPath}`);
            } catch (unlinkErr) {
                console.error(`Erro ao limpar arquivo temporário local:`, unlinkErr.message || unlinkErr);
            }
        }
    }
}

// Se o script for executado diretamente ou inicializado no servidor (não em modo de testes)
if (process.env.NODE_ENV !== 'test') {
    // 1. Executa o backup imediatamente na inicialização
    performBackup();

    // 2. Agenda os próximos backups: Segunda-feira e sexta-feira às 15:00h
    cron.schedule('0 15 * * 1,5', () => {
        performBackup();
    });
}

// Exporta a função para compatibilidade com o Jest e outros módulos
module.exports = { performBackup, extractTimestamp };