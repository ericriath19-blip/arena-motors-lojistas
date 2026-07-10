# Configuração — Painel de Vistoria de Lojistas

Este painel usa **Firebase Firestore** como banco de dados online e, opcionalmente,
**Google Apps Script** para sincronizar automaticamente o que for editado na
planilha do Google Sheets. São 3 arquivos:

- `index.html` — o painel (abrir no navegador ou publicar no GitHub Pages)
- `apps-script-sync.gs` — script para colar no Apps Script da planilha
- `CONFIGURACAO.md` — este guia

Sem configurar o Firebase, o painel **funciona normalmente** mostrando os dados
históricos de junho já importados da sua planilha — mas novos lançamentos feitos
pelo formulário ficam salvos só naquela sessão do navegador (somem ao fechar a aba).
Para ter edição e alimentação online de verdade, siga os passos abaixo.

---

## Passo 1 — Criar o projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **Adicionar projeto**, dê um nome (ex: `arena-motors-lojistas`) e conclua a criação
3. No menu lateral, vá em **Compilação > Firestore Database**
4. Clique em **Criar banco de dados**
5. Escolha o modo **Produção** (vamos ajustar as regras no Passo 3) e a região `southamerica-east1` (São Paulo)

## Passo 2 — Pegar as credenciais do app Web

1. No painel do projeto, clique no ícone de engrenagem > **Configurações do projeto**
2. Em **Seus aplicativos**, clique no ícone `</>` (Web) para registrar um app
3. Dê um nome (ex: `painel-lojistas`) e clique em **Registrar app**
4. Copie o objeto `firebaseConfig` que aparece — algo assim:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "arena-motors-lojistas.firebaseapp.com",
     projectId: "arena-motors-lojistas",
     storageBucket: "arena-motors-lojistas.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. Abra `index.html`, procure por `firebaseConfig` (perto do topo do `<script>` final)
   e substitua pelos valores copiados.

## Passo 3 — Ajustar as regras do Firestore

No console, vá em **Firestore Database > Regras**. Como esse projeto já é usado
pelo painel de leads (que exige autenticação), use uma regra específica para
liberar só as coleções `conferencias` e `config_listas`, sem mexer na proteção
do que já existe:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /conferencias/{doc} {
      allow read, write: if true;
    }
    match /config_listas/{doc} {
      allow read, write: if true;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ Isso deixa a coleção `conferencias` aberta para quem tiver as credenciais do
> projeto Firebase (não do painel). Como uso interno com poucas pessoas, costuma
> ser aceitável — mas se quiser mais segurança depois, podemos configurar
> Firebase Authentication também para este painel.

Clique em **Publicar**.

## Passo 4 — Publicar o painel

Igual fizemos com o painel de leads: suba os 3 arquivos para o mesmo repositório
GitHub (ou um novo) e ative o GitHub Pages. Me avise quando tiver criado o
repositório (ou quiser que eu use o mesmo do painel de leads) que eu cuido do
deploy.

## Passo 5 (opcional) — Sincronizar a partir da planilha Google Sheets

Se você quiser continuar lançando os dados na planilha e deixar que eles
apareçam automaticamente no painel:

1. Abra a planilha no Google Sheets
2. **Extensões > Apps Script**
3. Apague o conteúdo padrão e cole o conteúdo de `apps-script-sync.gs`
4. Preencha `PROJECT_ID` e `API_KEY` (mesmos valores do `firebaseConfig`)
5. Salve o projeto
6. Rode a função `sincronizarTudo` uma vez (menu **Executar**) para enviar
   todo o histórico já existente na planilha para o Firestore
7. Em **Acionadores** (ícone de relógio), adicione um novo gatilho:
   - Função: `onEditSync`
   - Evento: **Ao editar**
8. A partir daí, toda edição em uma linha completa das abas Leste, Sto Andre,
   Nações ou Sul é enviada automaticamente para o painel

---

Qualquer erro que aparecer (no Firestore, no Apps Script ou no painel), me
manda o print ou a mensagem que eu ajusto.
