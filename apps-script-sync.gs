/**
 * SINCRONIZAÇÃO GOOGLE SHEETS -> FIREBASE FIRESTORE
 * ---------------------------------------------------
 * Cole este código no editor de Apps Script vinculado à sua planilha
 * (Extensões > Apps Script). Ele envia cada linha editada de uma aba
 * de shopping (Leste, Sto Andre, Nações, Sul) para o Firestore, para
 * que o painel online reflita os lançamentos feitos na planilha.
 *
 * PRÉ-REQUISITOS:
 * 1. Ter criado o projeto Firebase e ativado o Firestore (ver CONFIGURACAO.md)
 * 2. Preencher PROJECT_ID e API_KEY abaixo
 * 3. As regras do Firestore precisam permitir escrita (ver CONFIGURACAO.md)
 * 4. Configurar o gatilho onEdit (Acionadores > Adicionar Acionador >
 *    função "onEditSync" > evento "Ao editar")
 */

const PROJECT_ID = "arena-motors-dashboard";     // mesmo projectId do firebaseConfig
const API_KEY = "AIzaSyADj6CWOUh66_G7qMoFmLxzorSRmwzhG3Q";
const ABAS_SHOPPING = ["Leste", "Sto Andre", "Nações", "Sul"];

function onEditSync(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  if (ABAS_SHOPPING.indexOf(sheetName) === -1) return;

  const row = e.range.getRow();
  if (row < 2) return; // ignora cabeçalho

  const headerRow = findHeaderRow(sheet, row);
  if (!headerRow) return;

  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const rec = {};
  headers.forEach((h, i) => { if (h) rec[String(h).trim()] = values[i]; });

  const dataConf = rec["Data conferência"];
  if (!dataConf || String(dataConf).indexOf("De ") !== 0) return; // linha de total/legenda

  const doc = montarDocumento(rec, sheetName);
  enviarParaFirestore(doc);
}

function findHeaderRow(sheet, fromRow) {
  for (let r = fromRow; r >= 1; r--) {
    const v = sheet.getRange(r, 1).getValue();
    if (String(v).indexOf("Data conferência") === 0) return r;
  }
  return null;
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function montarDocumento(rec, shopping) {
  const estIntegrador = num(rec["Estoque Integrador"]);
  const leads = num(rec["Lead Recebidos"]);
  const atratividade = rec["Atratividade de Estoque"] || rec["Atratividade do Estoque"];

  return {
    fields: {
      periodo: { stringValue: String(rec["Data conferência"] || "") },
      shopping: { stringValue: shopping },
      loja: { stringValue: String(rec["Loja"] || "") },
      gestor: { stringValue: String(rec["Gestor"] || "") },
      estoqueEstimado: { doubleValue: num(rec["Estoque Estimado"]) },
      estoqueIntegrador: { doubleValue: estIntegrador },
      whatsapp: { stringValue: String(rec["Whastapp conectado?"] || "Não") },
      atualizacao: { stringValue: String(rec["Estoque  Atualizado?"] || "") },
      respondeLead: { stringValue: String(rec["Responde Lead"] || "") },
      leadsRecebidos: { doubleValue: leads },
      atratividade: { doubleValue: num(atratividade) },
      compartilha: { stringValue: String(rec["Compartilha nosso conteúdo?"] || "Não") },
      criadoEm: { stringValue: new Date().toISOString() }
    }
  };
}

function enviarParaFirestore(doc) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/conferencias?key=${API_KEY}`;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(doc),
    muteHttpExceptions: true
  };
  const resp = UrlFetchApp.fetch(url, options);
  Logger.log(resp.getContentText());
}

/**
 * Sincronização manual em lote — roda uma vez para enviar TODOS os
 * registros já existentes na planilha de uma só vez.
 * Menu Apps Script > Executar > sincronizarTudo
 */
function sincronizarTudo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ABAS_SHOPPING.forEach(nome => {
    const sheet = ss.getSheetByName(nome);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    let headers = null;
    data.forEach(row => {
      if (String(row[0]).indexOf("Data conferência") === 0) {
        headers = row;
        return;
      }
      if (!headers || String(row[0]).indexOf("De ") !== 0) return;
      const rec = {};
      headers.forEach((h, i) => { if (h) rec[String(h).trim()] = row[i]; });
      const doc = montarDocumento(rec, nome);
      enviarParaFirestore(doc);
      Utilities.sleep(150); // evita rate limit
    });
  });
  Logger.log("Sincronização em lote concluída.");
}
