Nao estou enchegando onde o avaliador adiciona seu anexo.



Nao estou enchegando onde o avaliador adiciona seu anexo.


Onde anexar?

AnswerList só exibe o que já existe: para cada pergunta ele mostra o anexo do respondente e, no bloco do avaliador, apenas renderiza answer.attachment_evaluator se o campo vier preenchido; não há nenhum <input type="file"> ou botão de upload para o avaliador (frontend/src/components/AnswerList.jsx (lines 218-256)).
O método que salva a resposta do avaliador envia apenas answer_evaluator, date_evaluator e note por JSON quando faz o PATCH, portanto não há como enviar arquivo algum (frontend/src/components/AnswerList.jsx (lines 88-109)).
No back-end o campo existe (attachment_evaluator = models.FileField(...) em backend/apps/core/models.py (line 231)) e o serializer aceita o upload (Attachment_evaluator validado em backend/apps/core/serializers.py (lines 216-244)), mas como o front-end não coleta nem envia um arquivo, o avaliador nunca adiciona um anexo.
Se você precisa dessa funcionalidade, será necessário replicar algo como o input de arquivos usado para a empresa (frontend/src/components/CompanyAnswer.jsx (lines 266-289)), montar um FormData que inclua attachment_evaluator e ajustar o axios.patch para enviar multipart/form-data. Depois disso o link “Ver Anexo” passará a aparecer para os avaliadores também.

Crie um readme atraente para o meu projeto. Para colocar no github


Segue um modelo completo de README em português que você pode colocar no GitHub. Ajuste os itens entre colchetes para refletir dados reais do seu projeto.

# SMS – Sistema de Monitoramento e Supervisão

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Stack](https://img.shields.io/badge/stack-Django%20%2B%20React-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Plataforma web que centraliza o ciclo de avaliações entre empresas e avaliadores, permitindo acompanhar respostas, anexos, planos de ação e indicadores de evolução em tempo real.

---

## ✨ Principais Recursos
- **Avaliações Dinâmicas**: criação de formulários por categoria e subcategoria.
- **Fluxo Respondente x Avaliador**: cada pergunta registra respostas, notas e anexos de ambos os lados.
- **Gestão de Planos de Ação**: acompanhamento de status, responsáveis e prazos.
- **Exportação Inteligente**: geração de relatórios em XLSX com resumo e detalhes das perguntas.
- **Autenticação e Perfis**: controle de acesso por empresas, polos e usuários avaliadores.
- **Interface Responsiva**: frontend em React com navegação por abas e feedback visual.

---

## 🏗️ Arquitetura

```
backend/   # Django + DRF (apps/core)
frontend/  # React (Vite ou CRA) organizado por pages e components
```

- **Backend**: Django REST Framework com serializers robustos, validações de prazos e upload de anexos versionados por período.
- **Frontend**: React com Context API para autenticação, Axios para chamadas e componentes especializados (AnswerList, CompanyAnswer, EvaluationDetails etc.).

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL (ou SQLite para desenvolvimento)
- Yarn ou npm

### Backend
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

A API padrão é exposta em `http://localhost:8000` e o frontend em `http://localhost:5173` (ajuste conforme seu setup).

---

## ⚙️ Variáveis de Ambiente

Crie um `.env` em `backend/` e outro em `frontend/` com itens como:

```
# backend/.env
SECRET_KEY=...
DATABASE_URL=postgres://user:pass@host:port/db
DEBUG=True

# frontend/.env
VITE_API_URL=http://localhost:8000/api
```

---

## ✅ Testes

- **Backend**: `python manage.py test`
- **Frontend**: `npm run test` (se configurado)
- Utilize `pytest`/`jest` conforme sua stack de testes.

---

## 📦 Deploy

- Backend preparado para containers (Gunicorn + nginx) ou serviços PaaS.
- Frontend estático pode ser publicado no Vercel/Netlify/S3.
- Configure variáveis de ambiente de produção antes do deploy.

---

## 📚 Documentação Complementar
- `backend/apps/core/models.py`: modelagem completa de empresas, avaliações, respostas e planos.
- `frontend/src/components/*`: principais componentes reutilizáveis.
- `docs/` (se houver): guias adicionais, diagramas ou decisões arquiteturais.

---

## 🤝 Contribuição

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit (`git commit -m "Add nova feature"`)
4. Push (`git push origin feature/nova-feature`)
5. Abra um Pull Request

Verifique o lint e os testes antes de abrir o PR.

---

## 🛡️ Licença

Distribuído sob licença MIT. Veja `LICENSE` para mais detalhes.

---

## 📬 Contato

- Autor: [Seu Nome]  
- Email: [seu-email@empresa.com]  
- LinkedIn: [link] · Site: [link]

---

> “Medir é o primeiro passo para melhorar.”  
> Construído para dar transparência e agilidade ao processo de avaliação corporativa.





Auto context


Local

Chat

GPT-5.1-Codex

Medium
