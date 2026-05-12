const { performBackup } = require('./backup');
const { exec } = require('child_process');

// Mocks das dependências
jest.mock('megajs');
jest.mock('child_process');
jest.mock('fs');

describe('Fluxo de Backup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve chamar o comando de execução do SQL Server', async () => {
        // Simula que o exec do SQL funcionou e chamou o callback
        exec.mockImplementation((cmd, callback) => {
            callback(null); // null indica que não houve erro
        });

        await performBackup();

        // Verifica se a função exec (do sqlcmd) foi disparada pelo menos uma vez
        expect(exec).toHaveBeenCalled();
        
        // Verifica se o comando enviado contém as palavras chave do backup
        const comandoEnviado = exec.mock.calls[0][0];
        expect(comandoEnviado).toContain('BACKUP DATABASE');
        
        console.log("Teste de lógica de execução concluído com sucesso!");
    });
});