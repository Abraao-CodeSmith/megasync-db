const { Storage } = require('megajs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

/**
 * Extrai o timestamp numérico de um nome de arquivo no formato
 * `backup_${DB_NAME}_${timestamp}.bak`.
 *
 * Exemplo:
 * `backup_MeuBanco_1727100000000.bak` -> 1727100000000
 *
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

    // O parâmetro -C confia no certificado usado pelo SQL Server local.
    const sqlCommand =
        `sqlcmd -S "${dbInstance}" -E -C -Q "BACKUP DATABASE [${dbName}] TO DISK='${localPath}' WITH FORMAT"`;

    try {
        // 1. Executa o backup local no SQL Server via comando sqlcmd
        await new Promise((resolve, reject) => {
            exec(sqlCommand, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Erro no SQL Server: ${error.message}`));
                }

                if (stderr) {
                    console.warn(`Aviso do sqlcmd: ${stderr}`);
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

        console.log('Conexão com Mega.nz estabelecida.');

        // 3. Política de Retenção: mantém os 3 backups mais recentes no Mega.nz
        const files = (await storage.root.children) || [];
        const prefixoBackup = `backup_${dbName}`;
        const backupsAntigos = files.filter(
            (file) => file.name && file.name.startsWith(prefixoBackup)
        );

        // Ordena por data: do mais recente para o mais antigo
        const sortedBackups = backupsAntigos.sort((a, b) => {
            const timeA = extractTimestamp(a.name);
            const timeB = extractTimestamp(b.name);
            return timeB - timeA;
        });

        // Mantém 2 backups existentes para que, após o upload do novo,
        // o total no Mega.nz seja exatamente 3 backups.
        const MAX_BACKUPS = 3;
        const MAX_EXISTING_TO_KEEP = MAX_BACKUPS - 1;
        const backupsExcedentes = sortedBackups.slice(MAX_EXISTING_TO_KEEP);

        for (const file of backupsExcedentes) {
            console.log(`Removendo backup antigo excedente do Mega: ${file.name}`);

            try {
                await file.delete();
            } catch (deleteError) {
                console.error(
                    `Erro ao deletar arquivo antigo (${file.name}):`,
                    deleteError.message || deleteError
                );
            }
        }

        // 4. Upload do novo arquivo de backup para o Mega.nz
        console.log(`Subindo novo backup: ${fileName}`);
        console.log(`Lendo arquivo local: ${localPath}`);

        if (!fs.existsSync(localPath)) {
            throw new Error(`Arquivo não encontrado: ${localPath}`);
        }

        const fileSize = fs.statSync(localPath).size;

        console.log(
            `Tamanho do backup: ${(fileSize / 1024 / 1024).toFixed(2)} MB`
        );

        console.log('Iniciando upload para o Mega.nz...');

        const upload = storage.upload({
            name: fileName,
            size: fileSize
        });

        const uploadPromise = new Promise((resolve, reject) => {
            let ultimoBytes = 0;
            let ultimoTempo = Date.now();
            const larguraBarra = 30;

            upload.on('progress', (info) => {
                if (
                    info &&
                    typeof info.bytesUploaded === 'number' &&
                    typeof info.bytesTotal === 'number' &&
                    info.bytesTotal > 0
                ) {
                    const agora = Date.now();
                    const tempoDecorrido = (agora - ultimoTempo) / 1000;
                    const bytesEnviados = info.bytesUploaded - ultimoBytes;

                    const velocidadeMbps =
                        tempoDecorrido > 0
                            ? (bytesEnviados * 8) /
                              tempoDecorrido /
                              1024 /
                              1024
                            : 0;

                    const porcentagem =
                        (info.bytesUploaded / info.bytesTotal) * 100;

                    const preenchido = Math.round(
                        (porcentagem / 100) * larguraBarra
                    );

                    const barra =
                        '█'.repeat(Math.min(preenchido, larguraBarra)) +
                        '░'.repeat(
                            Math.max(larguraBarra - preenchido, 0)
                        );

                    const enviadosMB =
                        (info.bytesUploaded / 1024 / 1024).toFixed(2);
                    const totalMB =
                        (info.bytesTotal / 1024 / 1024).toFixed(2);

                    // \r retorna ao início da linha e evita várias linhas no terminal.
                    process.stdout.write(
                        `\r[${barra}] ${porcentagem.toFixed(1)}% | ` +
                        `${enviadosMB} MB / ${totalMB} MB | ` +
                        `${velocidadeMbps.toFixed(2)} Mbps   `
                    );

                    ultimoBytes = info.bytesUploaded;
                    ultimoTempo = agora;
                }
            });

            upload.on('complete', (file) => {
                // Garante que as mensagens seguintes comecem em uma nova linha.
                process.stdout.write('\n');
                resolve(file);
            });

            upload.on('error', (error) => {
                process.stdout.write('\n');
                reject(error);
            });
        });

        const fileStream = fs.createReadStream(localPath);

        fileStream.on('error', (error) => {
            upload.destroy(error);
        });

        fileStream.pipe(upload);

        await uploadPromise;

        console.log('Upload concluído com sucesso.');
        console.log('✅ Backup concluído e nuvem sincronizada!');
    } catch (err) {
        console.error(
            '❌ Erro durante o processo de backup:',
            err.message || err
        );
    } finally {
        // 5. Garante a limpeza do arquivo temporário local,
        // tanto em caso de sucesso quanto em caso de falha.
        if (fs.existsSync(localPath)) {
            try {
                fs.unlinkSync(localPath);
                console.log(`Arquivo temporário local limpo: ${localPath}`);
            } catch (unlinkError) {
                console.error(
                    'Erro ao limpar arquivo temporário local:',
                    unlinkError.message || unlinkError
                );
            }
        }
    }
}

// Executa diretamente, exceto quando o arquivo estiver sendo usado em testes.
if (process.env.NODE_ENV !== 'test') {
    // Executa o backup imediatamente na inicialização.
    performBackup();

    // Agenda os próximos backups: segunda-feira e sexta-feira às 15:00.
    cron.schedule('0 15 * * 1,5', () => {
        performBackup();
    });
}

// Exporta as funções para compatibilidade com Jest e outros módulos.
module.exports = { performBackup, extractTimestamp };
