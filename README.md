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

- 📦 Gera backups `.bak` automaticamente;
- ☁️ Envia os arquivos diretamente para o Mega.nz;
- 🧹 Remove backups antigos da nuvem antes de enviar o novo;
- ⏰ Executa tarefas agendadas automaticamente utilizando cron;
- 🔒 Mantém os dados organizados e seguros.

Ideal para servidores locais, pequenas empresas, automações internas e ambientes que precisam de backups simples e eficientes.

---

# ⚙️ Tecnologias utilizadas

| Tecnologia | Função |
|---|---|
| Node.js | Ambiente backend |
| MegaJS | Integração com Mega.nz |
| node-cron | Agendamento automático |
| dotenv | Gerenciamento de variáveis de ambiente |
| SQLCMD | Execução do backup SQL Server |
| Jest | Testes automatizados |

---

# 📂 Estrutura do projeto

```bash
megasync-db/
│
├── backup.js            # Script principal de backup
├── backup-manual.js     # Execução manual do backup
├── backup.test.js       # Testes automatizados
├── test-mega.js         # Teste de conexão com Mega.nz
├── .env.example         # Exemplo de variáveis de ambiente
├── package.json
└── package-lock.json
```

---

# 🔧 Como funciona

O fluxo do sistema é simples:

```text
SQL Server
   ↓
Geração do arquivo .bak
   ↓
Armazenamento temporário local
   ↓
Conexão com Mega.nz
   ↓
Remoção de backups antigos
   ↓
Upload do novo backup
   ↓
Limpeza do arquivo local
```

---

# 📥 Instalação

## 1️⃣ Clone o repositório

```bash
git clone https://github.com/Abraao-CodeSmith/megasync-db.git
```

---

## 2️⃣ Acesse a pasta

```bash
cd megasync-db
```

---

## 3️⃣ Instale as dependências

```bash
npm install
```

---

# 🔐 Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
MEGA_EMAIL=seuemail@mega.nz
MEGA_PASSWORD=suasenha

DB_INSTANCE=localhost
DB_NAME=SeuBanco

LOCAL_BACKUP_DIR=./backups
```

---

# ▶️ Executando o projeto

## Execução automática

O sistema utiliza cron para executar backups automaticamente.

Atualmente configurado para:

```cron
0 15 * * 1,5
```

Isso significa:

- 📅 Segunda-feira e sexta-feira
- 🕒 Às 15:00

---

## Execução manual

```bash
node backup-manual.js
```

---

# ☁️ Integração com Mega.nz

O projeto utiliza a biblioteca **MegaJS** para:

- autenticar na conta Mega;
- listar arquivos existentes;
- remover backups antigos;
- enviar o novo arquivo automaticamente.

---

# 🧪 Testando conexão com Mega.nz

Você pode validar sua conexão executando:

```bash
node test-mega.js
```

Saída esperada:

```bash
✅ Conexão estabelecida com sucesso!
```

---

# 🧠 Lógica principal do backup

O script principal:

1. Cria o diretório local de backup caso não exista;
2. Executa o comando `sqlcmd` para gerar o `.bak`;
3. Conecta ao Mega.nz;
4. Remove backups antigos;
5. Envia o novo arquivo;
6. Remove o backup local após upload.

---

# 🔄 Agendamento com Cron

Trecho utilizado:

```js
cron.schedule('0 15 * * 1,5', () => {
  performBackup();
});
```

---

# 🛡️ Possíveis melhorias futuras

- ✅ Compressão automática do backup;
- ✅ Histórico de múltiplos backups;
- ✅ Logs detalhados;
- ✅ Dashboard web;
- ✅ Integração com Google Drive e Dropbox;
- ✅ Notificações por e-mail ou WhatsApp;
- ✅ Dockerização;
- ✅ Criptografia dos arquivos.

---

# 📌 Requisitos

- Node.js instalado;
- SQL Server com `sqlcmd` configurado;
- Conta Mega.nz;
- Permissão de leitura/escrita no servidor.

---

# 🚨 Observações importantes

- O `sqlcmd` precisa estar disponível no PATH do sistema;
- O upload remove backups antigos automaticamente;
- O projeto utiliza autenticação integrada do SQL Server (`-E`).

---

# 📜 Scripts disponíveis

```bash
npm test
```

Executa os testes automatizados utilizando Jest.

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

Com poucos passos é possível manter backups recorrentes funcionando de forma totalmente automática.

