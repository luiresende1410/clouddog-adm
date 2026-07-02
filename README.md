# CloudDog ADM - Sistema de Gestão de Colaboradores

Sistema para gestão administrativa de colaboradores com controle de cadastro, férias, equipamentos e benefícios.

## Stack

- React 19 + Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- React Router DOM
- Lucide React (ícones)

## Setup

1. Copie `.env.example` para `.env` e preencha com suas credenciais Firebase:

```bash
cp .env.example .env
```

2. Instale as dependências:

```bash
npm install
```

3. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

## Configuração Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password)
3. Crie um Firestore Database
4. Copie as credenciais para o `.env`

### Estrutura Firestore

```
users/{uid}
  - email: string
  - role: "admin" | "colaborador"

colaboradores/{id}
  - nome, email, cargo, setor, gestor
  - dataAdmissao, dataEfetivacao
  - tipoContrato, status, telefone
  - createdAt, updatedAt
```

### Configurar primeiro admin

No Firebase Console > Firestore, crie manualmente um documento na collection `users`:
- Document ID: o UID do usuário (visível em Authentication)
- Campos: `email`, `role: "admin"`

## Perfis de Acesso

| Perfil | Acesso |
|--------|--------|
| Admin | Dashboard, CRUD colaboradores, férias, equipamentos, benefícios |
| Colaborador | Apenas visualização do próprio perfil |

## Módulos

- ✅ Login com autenticação
- ✅ Dashboard com estatísticas
- ✅ Cadastro de colaboradores (CRUD completo)
- ✅ Perfil do colaborador (visualização)
- 🚧 Controle de férias
- 🚧 Gestão de equipamentos
- 🚧 Controle de benefícios (VT/VR)
