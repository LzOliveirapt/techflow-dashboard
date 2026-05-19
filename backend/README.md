# 🔧 Backend TechFlow - SQLite

Backend simples e funcional para o projeto TechFlow usando PHP e SQLite.

## 📁 Estrutura

```
backend/
├── config.php                 # Configuração e conexão BD
├── init_db.php               # Inicializar BD com dados
├── api_utilizadores.php      # API principal
├── exemplo_integracao.html   # Página de testes interativa
├── GUIA_USO.md              # Guia completo de uso
├── database/
│   └── techflow.db          # BD SQLite (criada automaticamente)
└── README.md                # Este ficheiro
```

## 🚀 Quick Start

### 1. Inicializar Base de Dados
```bash
# Abra no navegador:
http://localhost/techflow-dashboard/backend/init_db.php
```

### 2. Acessar Página de Testes
```bash
# Abra no navegador:
http://localhost/techflow-dashboard/backend/exemplo_integracao.html
```

### 3. Testar Login
Use uma das credenciais de teste:
- **Email:** joao.silva@techflow.pt
- **Senha:** senha123

## 📊 Base de Dados

### Tabela: `utilizadores`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | ID único (chave primária) |
| nome | TEXT | Nome completo |
| email | TEXT | Email único |
| senha | TEXT | Senha (hash bcrypt) |
| tipo | TEXT | aluno, tecnico, admin |
| telefone | TEXT | Número de telefone |
| estado | TEXT | ativo, inativo |
| data_criacao | DATETIME | Data de criação |
| ultimo_acesso | DATETIME | Último login |

## 🔌 API Endpoints

### Login
```
POST /backend/api_utilizadores.php?acao=login
```

### Listar Utilizadores
```
GET /backend/api_utilizadores.php?acao=listar
```

### Obter Utilizador
```
GET /backend/api_utilizadores.php?acao=obter&id=1
```

### Criar Utilizador
```
POST /backend/api_utilizadores.php?acao=criar
```

### Atualizar Utilizador
```
PUT /backend/api_utilizadores.php?acao=atualizar&id=1
```

### Eliminar Utilizador
```
DELETE /backend/api_utilizadores.php?acao=eliminar&id=1
```

## 📚 Documentação Completa

Para informações detalhadas sobre cada endpoint, veja **GUIA_USO.md**

## 👥 Utilizadores de Teste

| Email | Senha | Tipo |
|-------|-------|------|
| joao.silva@techflow.pt | senha123 | aluno |
| maria.santos@techflow.pt | senha123 | aluno |
| pedro.costa@techflow.pt | senha123 | tecnico |
| ana.martins@techflow.pt | senha123 | tecnico |
| admin@techflow.pt | admin123 | admin |

## ⚙️ Requisitos

- PHP 7.4+
- SQLite3 (geralmente incluído no PHP)
- PDO (habilitado)

## 🔒 Segurança

✅ Senhas com hash bcrypt  
✅ Prepared statements (proteção SQL injection)  
✅ Validação de dados  
✅ CORS habilitado para desenvolvimento  

## 📝 Próximos Passos

- [ ] Implementar sessões/tokens
- [ ] Adicionar autenticação persistente
- [ ] Expandir para mais tabelas (cursos, disciplinas, etc.)
- [ ] Implementar logs de atividades
- [ ] Adicionar paginação

---

**Criado para:** Projeto TechFlow  
**Data:** 2026-05-19  
**Versão:** 1.0
