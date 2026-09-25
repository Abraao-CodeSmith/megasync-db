# 🚀 megasync-db

> Sistema automatizado de backup para SQL Server com envio seguro para a nuvem via Mega.nz.

![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js)
![SQL Server](https://img.shields.io/badge/SQL_Server-Database-red?style=for-the-badge&logo=microsoftsqlserver)
![Mega.nz](https://img.shields.io/badge/Mega.nz-Cloud_Backup-black?style=for-the-badge&logo=mega)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

---

## 📖 Sobre o projeto

O **megasync-db** é uma solução desenvolvida em Node.js para automatizar backups de bancos de dados SQL Server.

O sistema:

- 📦 Gera backups `.bak` automaticamente via `sqlcmd` com autenticação Windows integrada (`-E`);
- ☁️ Envia os arquivos diretamente para o Mega.nz;
- 🧹 Aplica política de retenção: mantém **no máximo 3 backups** no Mega.nz, removendo os mais antigos antes do upload;
- ⏰ Executa um backup **imediatamente ao iniciar** e agenda os próximos via cron;
- 🗑️ Remove o arquivo temporário local após o upload (ou em caso de falha), garantindo limpeza;
- 🔒 Mantém os dados organizados e seguros.

Ideal para servidores locais, pequenas empresas, automações internas e ambientes que precisam de backups simples e eficientes.

---

# ⚙️ Tecnologias utilizadas

| Tecnologia | Versão | Função |
|---|---|---|
| Node.js | — | Ambiente backend |
| MegaJS | ^1.3.10 | Integração com Mega.nz |
| node-cron | ^4.2.1 | Agendamento automático |
| dotenv | ^17.4.2 | Gerenciamento de variáveis de ambiente |
| SQLCMD | — | Execução do backup SQL Server |
| Jest | ^30.4.2 | Testes automatizados |

---

# 📂 Estrutura do projeto

```bash
megasync-db/
│
├── backup.js            # Script principal: backup automático agendado
├── backup-manual.js     # Script utilitário: sobe um .bak existente para pasta específica no Mega.nz
├── backup.test.js       # Testes automatizados com Jest
├── test-mega.js         # Utilitário para testar conexão com o Mega.nz
├── .env.example         # Modelo de variáveis de ambiente
├── package.json
└── package-lock.json
```

---

# 🔧 Como funciona

## Fluxo do backup automático (`backup.js`)

```text
Início do processo (imediato ou via cron)
   ↓
Cria diretório local de backup (se não existir)
   ↓
Executa sqlcmd → gera arquivo backup_<DB>_<timestamp>.bak localmente
   ↓
Conecta ao Mega.nz
   ↓
Política de retenção: lista backups existentes no Mega.nz
   ↓
Ordena por timestamp (mais recentes primeiro)
   ↓
Remove backups excedentes (mantém os 2 mais recentes para que, após o upload, o total seja 3)
   ↓
Upload do novo arquivo .bak para a raiz do Mega.nz
   ↓
Remove o arquivo temporário local (sempre, em bloco finally)
```

## Fluxo do backup manual (`backup-manual.js`)

```text
Conecta ao Mega.nz
   ↓
Verifica se a pasta "BACKUP_MANUAL_SEGURANCA" existe na raiz do Mega.nz
   ↓
Cria a pasta caso não exista
   ↓
Lê o arquivo local fixo: C:\backup_manual_seguranca.bak
   ↓
Faz upload com nome manual_backup_<timestamp>.bak dentro da pasta
```

---

# 📥 Instalação

## 1️⃣ Clone o repositório

```bash
git clone https://github.com/Abraao-CodeSmith/megasync-db.git
```

## 2️⃣ Acesse a pasta

```bash
cd megasync-db
```

## 3️⃣ Instale as dependências

```bash
npm install
```

---

# 🔐 Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
# Credenciais do Mega.nz
MEGA_EMAIL=seuemail@mega.nz
MEGA_PASSWORD=suasenha

# Banco de dados SQL Server
DB_INSTANCE=localhost
DB_NAME=SeuBanco

# Diretório temporário local para o .bak antes do upload
LOCAL_BACKUP_DIR=./backups
```

> **Atenção:** o `sqlcmd` utiliza autenticação Windows integrada (`-E`). Certifique-se de que o usuário que executa o script tem permissão no SQL Server.

---

# ▶️ Executando o projeto

## Execução automática (backup.js)

```bash
node backup.js
```

Ao iniciar, o script:

1. **Executa um backup imediatamente**;
2. **Agenda os próximos** automaticamente via cron.

### Agendamento atual

```cron
0 15 * * 1,5
```

- 📅 **Segunda-feira e sexta-feira**
- 🕒 **Às 15:00h**

---

## Execução manual (backup-manual.js)

Usado para subir manualmente um arquivo `.bak` já existente para uma pasta dedicada no Mega.nz.

**Pré-requisito:** o arquivo `C:\backup_manual_seguranca.bak` deve existir na máquina.

```bash
node backup-manual.js
```

O arquivo será enviado para a pasta `BACKUP_MANUAL_SEGURANCA` no Mega.nz com o nome `manual_backup_<timestamp>.bak`.

---

# ☁️ Integração com Mega.nz

O projeto utiliza a biblioteca **MegaJS** para:

- Autenticar na conta Mega.nz via e-mail e senha;
- Listar arquivos existentes na raiz da conta;
- Aplicar política de retenção (máximo 3 backups automáticos);
- Enviar o novo arquivo de backup;
- Criar pastas e fazer uploads para destinos específicos (modo manual).

---

# 🛡️ Política de retenção de backups

O sistema mantém **no máximo 3 backups automáticos** no Mega.nz:

- Os arquivos são identificados pelo prefixo `backup_<DB_NAME>` e ordenados pelo timestamp no nome;
- Antes de cada upload, os backups excedentes (além dos 2 mais recentes) são deletados;
- Após o upload do novo arquivo, o total na nuvem é sempre exatamente **3**.

```js
// Trecho de backup.js
const MAX_BACKUPS = 3;
const MAX_EXISTING_TO_KEEP = MAX_BACKUPS - 1; // mantém 2 antes de subir o novo
const backupsExcedentes = sortedBackups.slice(MAX_EXISTING_TO_KEEP);
```

---

# 🧪 Testando conexão com Mega.nz

Você pode validar suas credenciais executando:

```bash
node test-mega.js
```

Saída esperada:

```bash
✅ Conexão estabelecida com sucesso!
```

---

# 🧪 Testes automatizados

```bash
npm test
```

Executa os testes com **Jest**. Os testes cobrem a lógica principal em `backup.test.js`.

> O script `backup.js` detecta automaticamente o ambiente de testes (`NODE_ENV=test`) e não executa o backup nem inicia o cron quando rodado via Jest.

---

# 🔄 Agendamento com Cron

Trecho utilizado em `backup.js`:

```js
// Executa imediatamente ao iniciar
performBackup();

// Agenda execuções futuras: segunda e sexta às 15:00h
cron.schedule('0 15 * * 1,5', () => {
  performBackup();
});
```

---

# 📌 Requisitos

- Node.js instalado;
- SQL Server com `sqlcmd` disponível no PATH do sistema;
- Conta Mega.nz válida;
- Permissão de leitura/escrita no diretório de backup local;
- Permissão de acesso ao banco de dados via autenticação Windows integrada.

---

# 🚨 Observações importantes

- O `sqlcmd` usa autenticação integrada do Windows (`-E`), sem usuário/senha separados;
- O arquivo temporário local é **sempre removido** após o processo, inclusive em caso de erro (bloco `finally`);
- O `backup-manual.js` lê um caminho de arquivo **fixo** (`C:\backup_manual_seguranca.bak`) — ajuste conforme necessário;
- Backups manuais são salvos em uma **pasta separada** (`BACKUP_MANUAL_SEGURANCA`) no Mega.nz, sem política de retenção automática.

---

# 👨‍💻 Desenvolvedor

<div align="center">

## **Abraão Araújo**

Backend Developer • Node.js • Automação • Infraestrutura

<br>

<a href="https://www.linkedin.com/in/abraaofaraujo/">
  <img src="https://img.shields.io/badge/LinkedIn-Abraão%20Araújo-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
</a>

<a href="mailto:abraao.codesmith@gmail.com">
  <img src="https://img.shields.io/badge/Email-abraao.codesmith%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white" />
</a>

</div>

---

# ⭐ Considerações finais

O **megasync-db** foi criado para oferecer uma solução simples, leve e automatizada para backup de bancos SQL Server utilizando armazenamento em nuvem.

Com poucos passos é possível manter backups recorrentes funcionando de forma totalmente automática, com retenção controlada e limpeza garantida dos arquivos temporários.
