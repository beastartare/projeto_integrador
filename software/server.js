/**
 * @file server.js
 * @fileoverview Servidor meteorológico para receber dados do ESP, gerar previsões
 * de chuva via script Python (modelo XGBoost) e armazenar leituras em banco SQLite.
 *
 * @version 1.0.0
 * @date 2025-08-29
 * @lastmodified 2025-11-11
 *
 * @author
 * Rafaela Fernandes Savaris <savarisf.rafaela@gmail.com>
 * Beatriz Schulter Tartare <email_bia@gmail.com>
 *
 * @license Proprietary
 *
 * @requires express Criação do servidor e definição de rotas HTTP.
 * @requires cors Habilita requisições entre origens diferentes (CORS).
 * @requires node-fetch Realiza requisições externas (ex: feeds RSS).
 * @requires node-cron Agenda tarefas periódicas (como geração horária de previsão).
 * @requires child_process Execução de scripts Python para previsão.
 * @requires path Manipulação de caminhos de arquivos.
 * @requires url Resolução de caminhos e URLs.
 * @requires ./src/db/database.js Módulo de acesso ao banco SQLite.
 *
 * @description
 * Este servidor recebe leituras meteorológicas enviadas por um dispositivo ESP,
 * processa e armazena esses dados, gera previsões de chuva com um modelo Python (XGBoost)
 * e fornece rotas REST para consulta de dados, histórico e eventos astronômicos.
 *
 * ### Principais rotas
 * - `GET /events` - Retorna feed RSS de eventos astronômicos.
 * - `POST /dados` - Recebe dados do ESP e inicia previsão inicial.
 * - `POST /dados/refresh` - Força nova geração de previsão.
 * - `GET /dados/ultimo` - Retorna o último registro do banco.
 * - `GET /dados/historico` - Retorna os últimos 50 registros.
 * - `POST /cloudcover` - Atualiza cobertura de nuvens atual.
 *
 * ### Variáveis globais
 * - `__filename`
 * - `__dirname`
 * - `dadosESP`
 * - `cloudCover`
 * - `ultimaPrevisao`
 * - `ultimaAtualizacao`
 *
 * ### Funções principais
 * - `esperarCloudCover()` - Aguarda definição da cobertura de nuvens.
 * - `gerarFeatures()` - Gera features meteorológicas para previsão.
 * - `gerarPrevisao(features = null)` - Executa script Python e retorna previsão de chuva.
 * - `salvarUltimoDado(features = null)` - Salva leituras e previsão no banco de dados.
 *
 * ### Observações
 * - Inclui agendamento automático de previsão horária via node-cron.
 * - Requisições são compatíveis com front-end React e ESP via JSON.
 */

import { spawn } from "child_process";
import cors from "cors";
import express from "express";
import cron from "node-cron";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

import db from "./src/db/database.js";

/** @type {Express} */
const app = express();

/**
 * Habilita requisições Cross-Origin.
 */
app.use(cors());

/**
 * Porta em que o servidor irá escutar.
 * @constant {number}
 */
const PORT = 4000;

/**
 * Habilita o parsing de JSON no corpo das requisições.
 */
app.use(express.json());

/**
 * Caminho do arquivo atual (equivalente a __filename do CommonJS).
 * @constant {string}
 */
const __filename = fileURLToPath(import.meta.url);

/**
 * Diretório do arquivo atual (equivalente a __dirname do CommonJS).
 * @constant {string}
 */
const __dirname = path.dirname(__filename);

/**
 * Último dado meteorológico recebido do ESP.
 * @type {Object}
 */
let dadosESP = {};

/**
 * Cobertura de nuvens atual (cloudCover), atualizada via rota /cloudcover.
 * @type {number|null}
 */
let cloudCover = null;

/**
 * Última previsão gerada pelo modelo Python.
 * @type {Object|null}
 */
let ultimaPrevisao = null;

/**
 * Timestamp da última atualização recebida do ESP, em milissegundos.
 * @type {number}
 */
let ultimaAtualizacao = 0;

/**
 * Última precipitação registrada.
 * @type {number}
 */
let ultimaPrecipitacao = 0;

/**
 * Flag para controlar se a previsão inicial está em execução.
 * @type {boolean}
 */
app.locals.executandoPrevisaoInicial = false;

// ************************************* FUNÇÕES ************************************* //
/**
 * Espera até que a variável global `cloudCover` seja definida.
 * Faz verificações a cada 1 segundo até obter um valor válido.
 *
 * @function esperarCloudCover
 * @async
 * @returns {Promise<number>} Retorna uma Promise que resolve com o valor de "cloudCover" assim que ele for definido.
 */
async function esperarCloudCover() {
  const intervalo = 1000; // checa a cada 1 segundo

  while (cloudCover == null) {
    console.log("Aguardando definição de cloudCover...");
    await new Promise((resolve) => setTimeout(resolve, intervalo));
  }

  return cloudCover;
}

/**
 * Gera as features necessárias para a previsão e para o salvamento no banco, atualizando
 * o valor da última precipitação.
 *
 * A função aguarda até que a variável `cloudCover` esteja definida, garantindo que
 * todos os dados necessários estejam disponíveis. Em seguida, valida se os dados
 * recebidos do dispositivo ESP estão presentes e, caso contrário, lança um erro.
 * 
 * Salva a última precipitação registrada e retorna um array contendo as principais variáveis
 * meteorológicas que serão usadas pelo modelo de previsão e para o registro no banco de dados.
 *
 * @async
 * @function gerarFeatures
 * 
 * @returns {Promise<Array<number|string>>} Uma Promise que resolve com um array de features,
 * incluindo pressão atmosférica, temperatura, umidade, classificação UV, cobertura de nuvens
 * e precipitação.
 * 
 * @throws {Error} Se `dadosESP` não estiver definido ou estiver vazio.
 *
 * @example
 * try {
 *   const features = await gerarFeatures();
 *   console.log("Features geradas:", features);
 * } catch (error) {
 *   console.error("Erro ao gerar features:", error.message);
 * }
 */
async function gerarFeatures() {
  await esperarCloudCover();

  if (!dadosESP || Object.keys(dadosESP).length === 0) {
    throw new Error("Nenhum dado do ESP disponível para gerar features.");
  }

  return [
    dadosESP.pressaoAtm,
    dadosESP.temperatura,
    dadosESP.umidade,
    dadosESP.uvClassificacao,
    cloudCover ?? 0, // cloudCover ou 0 se nao definido
    dadosESP.precipitacao, // precipitação
  ];
}

/**
 * Gera a previsão de chuva com base nas *features* meteorológicas,
 * executando um script Python externo responsável pelo modelo de previsão.
 *
 * A função valida o conjunto de *features* fornecido, normaliza os dados e, caso
 * a precipitação atual seja maior que zero e diferente da última registrada,
 * os envia ao script Python (`server.py`) por meio de um processo filho.
 * O resultado retornado pelo Python é lido via *stdout*, interpretado em JSON
 * e resolvido como objeto JavaScript.
 * A previsão resultante é armazenada na variável global `ultimaPrevisao`.
 *
 * Em caso de falha na validação das *features* ou erro na execução/interpretação
 * do script Python, a Promise é rejeitada com uma mensagem descritiva.
 *
 * @async
 * @function gerarPrevisao
 * @param {Array<number>} [features=null] - Array contendo as *features* meteorológicas
 * necessárias para a previsão, na seguinte ordem:
 * `[pressaoAtm, temperatura, umidade, uvClassificacao, cloudCover, precipitacao]`.
 *
 * @returns {Promise<Object>} Retorna uma Promise que resolve com o objeto de previsão gerado
 * pelo script Python, contendo os resultados do modelo.
 *
 * @throws {Error} Caso as *features* estejam ausentes, inválidas ou ocorra erro ao interpretar
 * a resposta do script Python.
 *
 * @example
 * try {
 *   const previsao = await gerarPrevisao(features);
 *   console.log("Previsão gerada:", previsao);
 * } catch (error) {
 *   console.error("Erro ao gerar previsão:", error);
 * }
 */
async function gerarPrevisao(features = null) {
  return new Promise((resolve, reject) => {
    try {
      if (!features) {
          return reject("Sem dados atuais disponíveis");
      } else if(!Array.isArray(features) || features.length < 6) {
        return reject("Features inválidas para previsão");
      } else {
        const input = [
        features[0] * 0.01, // pressao_mbar
        features[1], // temperatura
        features[2], // umidade
        0, // ventoVelocidade
        0, // ventoDirecao
        features[4], // cloudCover
        ]
        if(features[5] > 0 && features[5] != ultimaPrecipitacao) {
          console.log("Precipitação detectada!");
          ultimaPrevisao = ({prediction: [[0, 1]]});
          ultimaPrecipitacao = features[5];
          return resolve(ultimaPrevisao);
        }
        features = input;
      }

      console.log("Gerando previsão com features:", features);

      const pyPath = path.join(__dirname, "src", "python", "server.py");
      const py = spawn("python", [pyPath]);

      let resultData = "";
      py.stdout.on("data", (data) => (resultData += data.toString()));
      py.stderr.on("data", (data) => console.error("Python stderr:", data.toString()));

      py.on("close", (code) => {
        console.log(`Processo Python finalizado com código: ${code}`);
        try {
          const parsed = JSON.parse(resultData);
          ultimaPrevisao = parsed;
          console.log("Nova previsão gerada:", parsed);
          resolve(parsed);
        } catch (err) {
          console.error("Erro ao interpretar saída Python:", err, resultData);
          reject("Erro ao interpretar resposta do modelo");
        }
      });

      py.stdin.write(JSON.stringify({ features }));
      py.stdin.end();
      ultimaPrecipitacao = features[5];

    } catch (error) {
      console.error("Erro ao gerar previsão:", error);
      reject(error);
    }
  });
}

/**
 * Salva no banco de dados as últimas leituras meteorológicas e a previsão de chuva associada.
 *
 * A função valida o conjunto de *features* recebido, compara com o último registro salvo
 * e insere um novo dado apenas se houver alterações significativas.
 * A probabilidade de chuva é obtida a partir da variável global `ultimaPrevisao`.
 *
 * @async
 * @function salvarUltimoDado
 * @param {Array<number>} [features=null] - Lista de *features* meteorológicas, na seguinte ordem:
 * `[pressaoAtm, temperatura, umidade, uvClassificacao, cloudCover, precipitacao]`.
 *
 * @returns {Promise<void>} Uma Promise que é resolvida após a operação de salvamento (ou ignorada se os dados forem idênticos).
 * @throws {Error} Se ocorrer falha ao acessar ou gravar no banco de dados.
 *
 * @example
 * await salvarUltimoDado([
 *   1013,   // pressaoAtm
 *   26.5,   // temperatura
 *   70,     // umidade
 *   5,      // uvClassificacao
 *   40,     // cloudCover
 *   0       // precipitacao
 * ]);
 */
async function salvarUltimoDado(features = null) {
  if (!features || !Array.isArray(features)) {
    console.log("Nenhum dado válido recebido para salvar.");
    return;
  }

  // desestruturação correta conforme a ordem das features
  const [pressaoAtm, temperatura, umidade, uvClassificacao, cloud, precipitacao] = features;

  // pega a probabilidade de chuva da última previsão (ou 0)
  const probabilidadeChuva = ultimaPrevisao?.prediction?.[0]?.[1] ?? 0;
  
  const last = db
    .prepare("SELECT * FROM dados_estacao_metereologica ORDER BY id DESC LIMIT 1")
    .get();

  if (
    last &&
    last.temperatura === temperatura &&
    last.umidade === umidade &&
    last.pressaoAtm === pressaoAtm &&
    last.uvClassificacao === uvClassificacao &&
    last.cloudCover === cloud &&
    last.rainProbability === probabilidadeChuva &&
    last.precipitacao === precipitacao
  ) {
    console.log("Último registro é igual, não salvou");
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO dados_estacao_metereologica (temperatura, umidade, pressaoAtm, uvClassificacao, created_at, cloudCover, rainProbability, precipitacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    temperatura,
    umidade,
    pressaoAtm,
    uvClassificacao,
    new Date().toISOString(),
    cloud,
    probabilidadeChuva,
    precipitacao
  );

  console.log(`Salvou dado: ${new Date().toISOString()}`);
  const ultimo = db.prepare(`
    SELECT * FROM dados_estacao_metereologica ORDER BY id DESC LIMIT 1
  `).get();

  console.log("Dado salvo no banco:", ultimo);
}

// ************************************* ROTAS *************************************** //
/**
 * @route GET /events
 * @summary Retorna um feed RSS de eventos astronômicos.
 *
 * Esta rota realiza uma requisição HTTP para o feed público de eventos astronômicos
 * disponível em `https://in-the-sky.org/rss.php` e retorna o conteúdo XML recebido
 * diretamente ao cliente. Em caso de falha na requisição, retorna um status HTTP 500 com uma mensagem de erro.
 *
 * @async
 * @function
 * 
 * @param {express.Request} req - Objeto da requisição Express.
 * @param {express.Response} res - Objeto da resposta Express usada para enviar o XML ou o erro.
 *
 * @returns {void} A resposta é enviada via `res.send()`, contendo o conteúdo XML do feed.
 *
 * @example
 * // Requisição:
 * GET /events
 *
 * // Resposta de sucesso (200 OK):
 * <?xml version="1.0" encoding="UTF-8"?>
 * <rss version="2.0">
 *   <channel>
 *     <title>Astronomical Events</title>
 *     <item>
 *       <title>Conjunção da Lua com Marte</title>
 *       <pubDate>Fri, 08 Nov 2025 03:00:00 GMT</pubDate>
 *       ...
 *     </item>
 *   </channel>
 * </rss>
 *
 * // Resposta de erro (500 Internal Server Error):
 * {
 *   "error": "Failed to fetch astronomical events feed."
 * }
 */
app.get("/events", async (req, res) => {
  try {
    const response = await fetch("https://in-the-sky.org/rss.php");
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

/**
 * @route POST /cloudcover
 * @summary Atualiza o valor da cobertura de nuvens (*cloudCover*).
 * 
 * Recebe um valor de cobertura de nuvens no corpo da requisição (`req.body.cloudCover`)
 * e o atualiza na variável global `cloudCover`. 
 * Retorna o novo valor definido, ou um erro caso o campo não seja enviado.
 *
 * @param {express.Request} req - Objeto da requisição Express contendo `cloudCover` no corpo (`body`).
 * @param {express.Response} res - Objeto da resposta Express usado para enviar o status e o JSON de retorno.
 *
 * @returns {void} A resposta é enviada diretamente via `res.json()`.
 *
 * @example
 * // Requisição (JSON):
 * {
 *   "cloudCover": 75
 * }
 *
 * // Resposta (200 OK):
 * {
 *   "ok": true,
 *   "cloudCover": 75
 * }
 *
 * // Resposta (400 Bad Request):
 * {
 *   "error": "cloudCover não enviado"
 * }
 */
app.post("/cloudcover", (req, res) => {
   const { cloudCover: novoValor } = req.body;

  if (novoValor == null) {
    return res.status(400).json({ error: "cloudCover não enviado" });
  }
  cloudCover = novoValor;
  res.json({ ok: true, cloudCover });
});

/**
 * @route POST /dados
 * @summary Recebe dados meteorológicos do dispositivo ESP e inicia a geração de previsão inicial.
 *
 * Esta rota é chamada pelo dispositivo ESP para enviar leituras meteorológicas.
 * Ao receber os dados, o servidor:
 * 1. Evita atualizações duplicadas em um intervalo menor que 5 segundos;
 * 2. Armazena os dados recebidos em `dadosESP`;
 * 3. Retorna uma resposta imediata (`{ ok: true }`);
 * 4. Executa, de forma assíncrona, a chamada da função `gerarFeatures`, salvando na variável local `features`
 * 5. Realiza, também de forma assíncrona, o processo de previsão inicial, chamando o modelo Python (a função `gerarPrevisao`)
 *    e salvando o resultado no banco (o módulo `salvarUltimoDado`).
 *
 * A execução da previsão inicial é controlada por flags internas (`app.locals.executandoPrevisaoInicial`
 * e `app.locals.primeiraConexao`) para evitar múltiplas execuções simultâneas.
 *
 * @async
 * @function
 *
 * @param {express.Request} req - Objeto da requisição Express contendo os dados meteorológicos enviados pelo ESP no corpo (`req.body`).
 * @param {express.Response} res - Objeto da resposta Express usado para enviar o status e a confirmação em JSON.
 *
 * @returns {void} A resposta é enviada via `res.json()`. Em caso de erro na geração da previsão, o erro é apenas registrado no console.
 *
 * @example
 * // Requisição:
 * POST /dados
 * Content-Type: application/json
 * {
 *   "temperatura": 23.5,
 *   "umidade": 82,
 *   "pressaoAtm": 1011,
 *   "uvClassificacao": "Baixa",
 *   "precipitacao": 0.2
 * }
 *
 * // Resposta imediata (200 OK):
 * {
 *   "ok": true
 * }
 *
 * // Exemplo de resposta ignorada (duplicada):
 * {
 *   "ok": true,
 *   "ignorado": true
 * }
 */
app.post("/dados", async (req, res) => {
  const agora = Date.now();
  if (agora - ultimaAtualizacao < 5000) {
    console.log("Ignorando atualização duplicada /dados");
    return res.status(200).json({ ok: true, ignorado: true });
  }
  ultimaAtualizacao = agora;

  dadosESP = req.body;
  res.json({ ok: true });

  if (app.locals.executandoPrevisaoInicial) {
    return;
  }

  if (app.locals.primeiraConexao) {
    return;
  }

  app.locals.executandoPrevisaoInicial = true;
  console.log("Gerando previsão inicial...");

  try {
    const features = await gerarFeatures();
    await gerarPrevisao(features);
    await salvarUltimoDado(features);
    app.locals.primeiraConexao = true;
  } catch (err) {
    console.error("Erro ao gerar previsão inicial:", err);
  } finally {
    app.locals.executandoPrevisaoInicial = false;
  }
});

/**
 * @route POST /dados/refresh
 * @summary Gera uma nova previsão de chuva com base nos dados meteorológicos atuais do ESP.
 *
 * Esta rota força a atualização da previsão de chuva usando as *features* mais recentes
 * armazenadas em `dadosESP`. Antes de iniciar, verifica se já existe uma previsão em execução
 * para evitar sobrecarga do servidor. Caso não haja previsão em andamento:
 * 1. As *features* são geradas via `gerarFeatures()`;
 * 2. O modelo Python é chamado para gerar a previsão (`gerarPrevisao()`);
 * 3. Os dados e a previsão são salvos no banco (`salvarUltimoDado()`).
 *
 * @async
 * @function
 *
 * @param {express.Request} req - Objeto da requisição Express. Os dados meteorológicos podem ser enviados no corpo (`req.body`), mas não são obrigatórios.
 * @param {express.Response} res - Objeto da resposta Express usado para enviar status e resultado em JSON.
 *
 * @returns {void} A resposta é enviada via `res.json()`. Em caso de erro, retorna status HTTP 500 com uma mensagem descritiva. Se já houver previsão em execução, retorna 429.
 *
 * @example
 * // Requisição:
 * POST /dados/refresh
 *
 * // Resposta de sucesso (200 OK):
 * {
 *   "ok": true,
 *   "previsao": {
 *     "prediction": 0.42,
 *     "timestamp": "2025-11-07T12:00:00.000Z"
 *   }
 * }
 *
 * // Resposta se previsão já estiver em execução (429):
 * {
 *   "error": "Previsão em execução, tente novamente."
 * }
 *
 * // Resposta de erro genérico (500):
 * {
 *   "error": "Erro ao gerar previsão ou salvar dado"
 * }
 */
app.post("/dados/refresh", async (req, res) => {
  try {
    if (app.locals.executandoPrevisao) {
      return res.status(429).json({ error: "Previsão em execução, tente novamente." });
    }

    app.locals.executandoPrevisao = true;

    const features = await gerarFeatures();

    const previsao = await gerarPrevisao(features);
    await salvarUltimoDado(features);
    res.json({ ok: true, previsao });
  } catch (err) {
    console.error("Erro no refresh:", err);
    res.status(500).json({ error: "Erro ao gerar previsão ou salvar dado" });
  } finally {
    app.locals.executandoPrevisao = false;
  }
});

/**
 * @route GET /dados/ultimo
 * @summary Retorna o último registro de leituras meteorológicas armazenadas no banco de dados.
 *
 * Esta rota consulta a tabela `dados_estacao_metereologica` do banco SQLite e retorna o registro mais recente
 * em formato JSON. É usada pelo front-end para obter os dados atuais do dispositivo ESP,
 * incluindo temperatura, umidade, pressão atmosférica, UV, cobertura de nuvens, probabilidade de chuva, etc.
 *
 * Em caso de falha na consulta ao banco, a rota retorna um status HTTP 500 com uma mensagem de erro genérica.
 *
 * @param {express.Request} req - Objeto da requisição Express.
 * @param {express.Response} res - Objeto da resposta Express usado para enviar o registro ou o erro.
 *
 * @returns {void} A resposta é enviada diretamente via `res.json()`.
 *
 * @example
 * // Requisição:
 * GET /dados/ultimo
 *
 * // Resposta de sucesso (200 OK):
 * {
 *   "id": 42,
 *   "temperatura": 25.5,
 *   "umidade": 80,
 *   "pressaoAtm": 1012,
 *   "uvClassificacao": 3,
 *   "cloudCover": 60,
 *   "rainProbability": 0.35,
 *   "precipitacao": 0,
 *   "created_at": "2025-11-07T12:15:00.000Z"
 * }
 *
 * // Resposta de erro (500 Internal Server Error):
 * {
 *   "error": "Erro ao buscar último dado"
 * }
 */
app.get("/dados/ultimo", (req, res) => {
  try {
    const ultimoDado = db.prepare(`
      SELECT * FROM dados_estacao_metereologica
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `).get();

    res.json(ultimoDado);
  } catch (error) {
    console.error("Erro ao buscar último dado:", error);
    res.status(500).json({ error: "Erro ao buscar último dado" });
  }
});

/**
 * @route GET /dados/historico
 * @summary Retorna os últimos 50 registros de leituras meteorológicas armazenados no banco de dados.
 *
 * Esta rota consulta a tabela `dados_estacao_metereologica` no banco de dados SQLite e retorna
 * os 50 registros mais recentes em formato JSON.
 * 
 * Em caso de erro na consulta ao banco, retorna um status HTTP 500 com uma mensagem
 * de erro genérica, sem expor detalhes técnicos.
 *
 * @param {express.Request} req - Objeto de requisição Express.
 * @param {express.Response} res - Objeto de resposta Express usado para enviar os dados ou erros.
 *
 * @returns {void} A resposta é enviada diretamente via `res.json()`.
 *
 * @example
 * // Requisição:
 * GET /dados/historico
 *
 * // Resposta de sucesso (200 OK):
 * [
 *   {
 *     "id": 1,
 *     "temperatura": 22.5,
 *     "umidade": 75,
 *     "pressaoAtm": 1013,
 *     "uvClassificacao": 2,
 *     "cloudCover": 0.7,
 *     "rainProbability": 0.3,
 *     "precipitacao": 0,
 *     "created_at": "2025-11-07T10:23:00.000Z"
 *   },
 *   ...
 * ]
 *
 * // Resposta de erro (500 Internal Server Error):
 * {
 *   "error": "Erro ao buscar histórico de leituras."
 * }
 */
app.get("/dados/historico", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const rows = db
      .prepare("SELECT * FROM dados_estacao_metereologica ORDER BY id DESC LIMIT ? OFFSET ?")
      .all(limit, offset);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error.message);
    res.status(500).json({ error: "Erro ao buscar histórico de leituras." });
  }
});

/**
 * Tarefa agendada para gerar e salvar previsões meteorológicas a cada hora cheia.
 * 
 * Esta função é executada automaticamente pelo `node-cron` no minuto zero de cada hora.
 * O fluxo da tarefa é:
 * 1. Gera as *features* meteorológicas atuais chamando `gerarFeatures()`.
 * 2. Executa o modelo de previsão Python via `gerarPrevisao(features)`.
 * 3. Salva as leituras e a previsão no banco de dados com `salvarUltimoDado(features)`.
 *
 * Em caso de erro em qualquer etapa, o erro é registrado no console.
 *
 * @async
 * @function gerarPrevisaoAgendada
 *
 * @example
 * // Exemplo de execução automática:
 * // No cron: "0 * * * *" → executa todo dia, na hora cheia.
 * // Console output esperado:
 * Gerando nova previsão programada...
 * Nova previsão gerada: { ... }
 * Previsão e dados salvos com sucesso na hora cheia.
 * // Em caso de erro:
 * Erro ao gerar previsão programada: [Error details]
 */
cron.schedule("0 * * * *", async() => {
  console.log("Gerando nova previsão programada...");
  try {
    const features = await gerarFeatures();

    // gera a previsão com os dados atuais
    await gerarPrevisao(features);

    // salva os dados + previsão
    await salvarUltimoDado(features);

    console.log("Previsão e dados salvos com sucesso na hora cheia.");
  } catch (err) {
    console.error("Erro ao gerar previsão programada:", err);
  }
});

/**
 * Inicializa o servidor Express e inicia o agendamento de tarefas.
 *
 * O servidor escuta na porta definida em `PORT` e no endereço "0.0.0.0",
 * permitindo acesso em toda a rede local. Ao iniciar, registra uma mensagem
 * no console confirmando que o servidor está ativo.
 *
 * Também indica que o agendamento de salvamento de previsões a cada hora
 * já foi iniciado pelo cron.
 *
 * @function iniciarServidor
 *
 * @example
 * // Console output esperado após iniciar o servidor:
 * Servidor rodando na rede na porta 4000
 * Agendamento de salvamento a cada hora cheia iniciado
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na rede na porta ${PORT}`);
});
console.log("Agendamento de salvamento a cada hora cheia iniciado");