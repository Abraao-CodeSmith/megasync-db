const { performBackup, extractTimestamp } = require('./backup');
const { exec } = require('child_process');
const { Storage } = require('megajs');
const fs = require('fs');

// Mocks das dependências
jest.mock('megajs');
jest.mock('child_process');
jest.mock('fs');

describe('Fluxo de Backup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DB_NAME = 'TestDB';
        process.env.DB_INSTANCE = 'localhost';
        process.env.MEGA_EMAIL = 'test@example.com';
        process.env.MEGA_PASSWORD = 'password';
        process.env.LOCAL_BACKUP_DIR = './backups';
    });

    describe('Função de Extração de Timestamp', () => {
        it('deve extrair corretamente o timestamp do nome do arquivo', () => {
            expect(extractTimestamp('backup_TestDB_1727100000000.bak')).toBe(1727100000000);
            expect(extractTimestamp('backup_Complex_DB_Name_99999.bak')).toBe(99999);
        });

        it('deve retornar 0 para nomes de arquivo sem timestamp válido', () => {
            expect(extractTimestamp('backup_TestDB.bak')).toBe(0);
            expect(extractTimestamp(null)).toBe(0);
            expect(extractTimestamp(undefined)).toBe(0);
        });
    });

    describe('Execução do Backup', () => {
        it('deve chamar o comando de execução do SQL Server', async () => {
            exec.mockImplementation((cmd, callback) => {
                callback(null);
            });

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(Buffer.from('fake backup content'));

            const mockDelete = jest.fn().mockResolvedValue(true);
            const mockUpload = jest.fn().mockReturnValue({ complete: Promise.resolve() });

            Storage.mockImplementation(() => ({
                ready: Promise.resolve({
                    root: {
                        children: [
                            { name: 'backup_TestDB_1000.bak', delete: mockDelete },
                            { name: 'backup_TestDB_2000.bak', delete: mockDelete }
                        ]
                    },
                    upload: mockUpload
                })
            }));

            await performBackup();

            expect(exec).toHaveBeenCalled();
            const comandoEnviado = exec.mock.calls[0][0];
            expect(comandoEnviado).toContain('BACKUP DATABASE');
        });

        it('deve aplicar a política de retenção mantendo os 3 backups mais recentes', async () => {
            exec.mockImplementation((cmd, callback) => callback(null));

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(Buffer.from('fake content'));

            const deleteMock1 = jest.fn().mockResolvedValue(true);
            const deleteMock2 = jest.fn().mockResolvedValue(true);
            const deleteMock3 = jest.fn().mockResolvedValue(true);
            const deleteMock4 = jest.fn().mockResolvedValue(true);

            // 4 backups no Mega: timestamps 4000 (mais recente), 3000, 2000, 1000 (mais antigo)
            // Como limite máximo é 3 no total (incluindo o novo), os 2 mais recentes existentes (4000 e 3000) devem ser mantidos.
            // Os backups com timestamp 2000 e 1000 devem ser deletados.
            const filesOnMega = [
                { name: 'backup_TestDB_1000.bak', delete: deleteMock1 },
                { name: 'backup_TestDB_4000.bak', delete: deleteMock2 },
                { name: 'backup_TestDB_2000.bak', delete: deleteMock3 },
                { name: 'backup_TestDB_3000.bak', delete: deleteMock4 }
            ];

            const mockUpload = jest.fn().mockReturnValue({ complete: Promise.resolve() });

            Storage.mockImplementation(() => ({
                ready: Promise.resolve({
                    root: { children: filesOnMega },
                    upload: mockUpload
                })
            }));

            await performBackup();

            // Verifica se deletou os excedentes (1000 e 2000)
            expect(deleteMock1).toHaveBeenCalled(); // 1000 foi deletado
            expect(deleteMock3).toHaveBeenCalled(); // 2000 foi deletado
            expect(deleteMock2).not.toHaveBeenCalled(); // 4000 mantido
            expect(deleteMock4).not.toHaveBeenCalled(); // 3000 mantido

            expect(mockUpload).toHaveBeenCalled();
        });

        it('deve garantir a remoção do arquivo temporário local em caso de erro', async () => {
            exec.mockImplementation((cmd, callback) => callback(new Error('Falha no SQLcmd')));
            fs.existsSync.mockReturnValue(true);

            await performBackup();

            expect(fs.unlinkSync).toHaveBeenCalled();
        });
    });
});