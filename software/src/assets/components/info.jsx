/**
 * @file info.jsx
 * @fileoverview Painel meteorológico da página principal. Exibe os dados mais
 * recentes coletados pelo servidor, incluindo temperatura, umidade, pressão,
 * cobertura de nuvens, índice UV e probabilidade de chuva prevista pelo modelo.
 *
 * @version 1.0.0
 * @date
 * @lastmodified 2025-11-14
 *
 * @author
 * Rafaela Fernandes Savaris <savarisf.rafaela@gmail.com>
 * Beatriz Schulter Tartare <email_bia@gmail.com>
 *
 * @license Proprietary
 *
 * @requires react-router-dom Navegação entre páginas (useNavigate)
 * @requires react Hooks do React (useState, useEffect, useCallback)
 *
 * @description
 * O componente `Info` é responsável por:
 * - Buscar periodicamente (a cada 20 segundos) o último registro de dados
 *   meteorológicos armazenados no backend.
 * - Exibir os valores mais recentes, incluindo a probabilidade de chuva.
 * - Permitir atualização manual, que força o servidor a gerar uma nova previsão.
 * - Navegar para a tela de histórico completo.
 *
 * ### Variáveis globais
 * - `API_URL`: URL base da API backend.
 *
 * ### Hooks utilizados
 * - `useState`: armazena dados do sensor, horário da última atualização e estado do botão de refresh.
 * - `useEffect`: inicializa o carregamento automático e define o intervalo periódico.
 * - `useCallback`: memoiza funções internas (`fetchLastData`, `handleRefresh`).
 *
 * ### Funções principais
 * - `fetchLastData()`: Busca o último registro do servidor e atualiza o estado.
 * - `handleRefresh()`: Solicita ao servidor que gere uma nova previsão e atualiza os dados.
 * - `ViewHistory()`: Redireciona o usuário para a página de histórico.
 * - `Info()`: Componente React principal responsável pela renderização dos dados.
 *
 * ### Observações
 * - Caso o servidor não retorne previsão, o componente exibe "No prediction available".
 * - O botão de atualização exibe animação com base no estado `isRefreshing`.
 */
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

/**
 * Endereço base da API backend.
 * @constant {string}
 */
const API_URL = "https://projeto-integrador-nk5o.onrender.com";

/**
 * @component Info
 * @description
 * Exibe as últimas medições da estação meteorológica e permite atualizar
 * manualmente a previsão, além de acessar o histórico de registros.
 *
 * @returns {JSX.Element} Interface com os dados mais recentes.
 */
function Info() {
  const navigate = useNavigate();

  /**
   * Dados mais recentes obtidos do servidor.
   * @typedef {Object} SensorData
   * @property {?number} temperatura - Temperatura em graus Celsius.
   * @property {?number} umidade - Umidade relativa em porcentagem.
   * @property {?number} pressaoAtm - Pressão atmosférica em Pascal.
   * @property {string} uvClassificacao - Classificação do índice UV.
   * @property {?number} prediction - Probabilidade de chuva (0 a 1).
   */

  /** @type {[SensorData, Function]} */
  const [sensorData, setSensorData] = useState({
    temperatura: null,
    umidade: null,
    pressaoAtm: null,
    uvClassificacao: "-",
    prediction: null,
  });

  /**
   * Armazena a data/hora da última atualização recebida.
   * @type {[Date|null, Function]}
   */
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Indica se o sistema está no processo de atualização/refresh.
   * @type {[boolean, Function]}
   */
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Busca o último registro de dados armazenado no servidor.
   *
   * @async
   * @function fetchLastData
   * @returns {Promise<void>}
   */
  const fetchLastData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/dados/ultimo`);
      const data = await response.json();

      setSensorData({
        temperatura: data.temperatura,
        umidade: data.umidade,
        pressaoAtm: data.pressaoAtm,
        uvClassificacao: data.uvClassificacao,
        prediction: data.rainProbability,
      });

      setLastUpdated(new Date(data.created_at));
    } catch (error) {
      console.error("Erro ao buscar último dado:", error);
    }
  }, []);

  /**
   * Realiza manualmente a atualização dos dados chamando o endpoint
   * de geração de previsão e depois recarregando os valores mais recentes.
   *
   * @async
   * @function handleRefresh
   * @returns {Promise<void>}
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/dados/refresh`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Erro no refresh:",
          errorData.error || response.statusText
        );
        alert("Erro ao gerar previsão. Tente novamente mais tarde.");
        setIsRefreshing(false);
        return;
      }
      await fetchLastData();
    } catch (error) {
      console.error("Erro no refresh:", error);
      alert("Erro de conexão com o servidor.");
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLastData]);

  /**
   * Carrega os dados automaticamente ao montar o componente
   * e atualiza a cada 20 segundos.
   *
   * @effect
   */
  useEffect(() => {
    fetchLastData();

    const interval = setInterval(fetchLastData, 20000);
    return () => clearInterval(interval);
  }, [fetchLastData]);

  /**
   * Navega para a página de histórico de medições.
   *
   * @function ViewHistory
   */
  function ViewHistory() {
    navigate("/history");
  }

  /**
   * Formata a data/hora da última atualização para exibição no layout.
   *
   * @type {string}
   */
  const formattedDateTime = lastUpdated
    ? lastUpdated.toLocaleString([], {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

  return (
    <div className="bg-purple-800 rounded-lg p-4 sm:p-6 md:p-8 mt-6 shadow w-full max-w-5xl mx-auto flex overflow-x-hidden flex-col">
      <div className="flex justify-between items-start">
        <div className="flex text-sm md:text-xl sm:text-sm font-bold text-slate-200 gap-4">
          <div>
            <p>Temperature: {sensorData.temperatura} °C</p>
            <p>Humidity: {sensorData.umidade} %</p>
          </div>
          <div>
            <p>UV Index: {sensorData.uvClassificacao}</p>
            <p>
              {isRefreshing ? (
                <p>Loading prediction...</p>
              ) : sensorData.prediction === null ? (
                <p>No prediction available</p>
              ) : sensorData.prediction !== null ? (
                <p>
                  Rain probability now:{" "}
                  {(sensorData.prediction * 100).toFixed(2)}%
                </p>
              ) : (
                <p>Loading prediction...</p>
              )}
            </p>
          </div>
          <div>
            <p>
              Atmospheric Pressure:{" "}
              {sensorData.pressaoAtm !== null
                ? Number(sensorData.pressaoAtm).toFixed(2)
                : "-"}{" "}
              Pa
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-sm text-slate-200 rounded-md flex right gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865 a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>
      <div className="flex text-sm md:text-xl font-bold text-slate-200 gap-16"></div>
      <div className="flex justify-between items-center gap-3 mt-4 mb-2">
        <small className="text-sm text-slate-400">
          Updated: {formattedDateTime}
        </small>
        <button
          onClick={ViewHistory}
          className="px-3 py-1 text-sm text-slate-200 bg-purple-600 hover:bg-purple-700 rounded-lg"
        >
          View History
        </button>
      </div>
    </div>
  );
}

export default Info;
