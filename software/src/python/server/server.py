""" 
* **************************************************************************
* Nome do arquivo: server.py
* Descrição: Script de predição usando modelo XGBoost.
* Autora: Rafaela Fernandes Savaris
* Data de criação: 29/10/2025
* Última modificação: 29/10/2025
* Contato: savarisf.rafaela@gmail.com
* **************************************************************************
* Descrição:
* Este script lê dados JSON da entrada padrão (`stdin`), carrega um modelo
* treinado (`modelo_xgb.json`) e retorna a probabilidade de predição em
* formato JSON.
*
* Fluxo:
* 1. Lê e valida os dados de entrada.
* 2. Carrega o modelo XGBoost a partir do caminho especificado.
* 3. Executa a predição e retorna a probabilidade.
* 
* Entradas:
*    - JSON via stdin, com a chave "features" contendo a lista de atributos.
*
* Saídas:
*    - JSON com a chave "prediction", contendo as probabilidades.
*    - Em caso de erro, JSON com a chave "error" e a descrição do erro.
*
* Tratamento de erros:
*    - Leitura de entrada inválida: imprime {"error": "..."} e encerra com código 1.
*    - Falha ao carregar modelo: imprime {"error": "..."} e encerra com código 1.
*    - Falha na predição: imprime {"error": "..."} e encerra com código 1.
* 
* Requisitos:
*   - Python 3.13.1
*   - Bibliotecas:
*       - json: trabalha com dados JSON;
*       - os: interage com o sistema operacional;
*       - sys: manipula o ambiente de execução e entrada/saída;
*       - xgboost: implementa o algoritmo XGBoost.
* **************************************************************************
"""
import json
import os
import sys
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "modelo_xgb.json")

# Lê dados de entrada e extrai features
try:
    input_str = sys.stdin.read()
    data = json.loads(input_str)
    features = data["features"]
except Exception as e:
    print(json.dumps({"error": f"Erro ao ler entrada: {e}"}))
    sys.exit(1)

# Carrega modelo XGBoost salvo na localização especificada
try:
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
except Exception as e:
    print(json.dumps({"error": f"Erro ao carregar modelo: {e}"}))
    sys.exit(1)

# Realiza predição e retorna resultado em formato JSON
try:
    pred_prob = model.predict_proba([features])
    print(json.dumps({"prediction": pred_prob.tolist()}))
except Exception as e:
    print(json.dumps({"error": f"Erro ao predizer: {e}"}))
    sys.exit(1)