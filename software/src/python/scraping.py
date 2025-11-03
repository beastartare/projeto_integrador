from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin # Importação movida para o topo

app = Flask(__name__)
# Permite que qualquer front-end (como o seu no Vercel) acesse esta API
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route('/get_first_image', methods=['POST'])
def get_first_image():
   
    data = request.get_json()
    link_site = data.get('link')

    if not link_site:
        # 400 Bad Request: Link não fornecido
        return jsonify({'error': 'Link do site não fornecido.'}), 400

    try:
      
        # 1. Acessa o site
        res = requests.get(link_site)
        res.raise_for_status() # Lança exceção para erros HTTP (4xx ou 5xx)
        
        # 2. Faz o parsing do HTML
        dados = BeautifulSoup(res.text, "html.parser")
       
        # 3. Encontra a primeira tag de imagem
        primeira_imagem = dados.find('img')
        
      
        if primeira_imagem:
          
            # 4. Obtém a URL relativa da imagem
            url_imagem_relativa = primeira_imagem.get('src')
            
           
            # 5. Converte para URL absoluta (importação movida para o topo)
            url_completa = urljoin(link_site, url_imagem_relativa)
            
    
            # 6. Retorna o JSON com a URL
            return jsonify({'image_url': url_completa})
        else:
            # 404 Not Found: Nenhuma imagem encontrada
            return jsonify({'error': 'Nenhuma imagem encontrada na página.'}), 404

    except requests.exceptions.RequestException as e:
        # 500 Internal Server Error: Erro de conexão ou requisição
        return jsonify({'error': f'Erro ao acessar o site: {e}'}), 500
    
@app.route('/get_icon', methods=['POST'])
def get_icon():
    data = request.get_json()
    link_site = data.get('link')

    if not link_site:
        return jsonify({'error': 'Link do site não fornecido.'}), 400

    try:
        res = requests.get(link_site)
        res.raise_for_status() 
        
        dados = BeautifulSoup(res.text, "html.parser")
        imagens = dados.find_all('img')  # pega todas as imagens

        if len(imagens) > 1:
            # O código original pega o ALT da segunda imagem.
            segundo_icon = imagens[1] 
            alt_text = segundo_icon.get('alt', 'Sem texto ALT')
            return jsonify({'icon_alt': alt_text})
        else:
            return jsonify({'error': 'Menos de duas imagens encontradas.'}), 404

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Erro ao acessar o site: {e}'}), 500

@app.route('/get_credits', methods=['POST'])
def get_credits():
    data = request.get_json()
    link_site = data.get('link')

    if not link_site:
        return jsonify({'error': 'Link do site não fornecido.'}), 400

    try:
        res = requests.get(link_site)
        res.raise_for_status() 
        
        dados = BeautifulSoup(res.text, "html.parser")
        # Procura a tag <h2> que tem o texto 'Image credit'
        texto = dados.find('h2', string='Image credit')  

        if texto: 
            # Pega o parágrafo irmão seguinte
            credit = texto.find_next_sibling('p').text
            return jsonify({'credit_text': credit})
        else:
            return jsonify({'error': 'sem creditos.'}), 404

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Erro ao acessar o site: {e}'}), 500


if __name__ == '__main__':
    app.run(debug=True)


