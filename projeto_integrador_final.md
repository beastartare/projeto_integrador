# O que falta no PI:

## Hardware:
1) Pluviometro
	- Falta fixar ele, mas ele está funcionando
2) Documentar o código

---

## Software:

### Página principal:
1) Verificar responsividade da página em si
~~2) Arrumar o widget que aparece as infos do hardware para tirar as infos do vento~~
3) Arrumar a responsividade da barra de cobertura de nuvens (aquele 100% para fora)
4) Adicionar a data dos eventos
~~5) Mudar onde a previsao de chuva aparece~~
~~6) Chuva em 100% se o pluviometro identificar chuva~~
7) Talvez por imagem na barra de cobertura de nuvens

### Página "About":
1) Link dos git de cada um
~~2) Adicionar o eduardo na pagina de sobre~~
3) Verificar responsividade da página em si
4) Melhorar o texto do about

### Página "History": 
~~1) Retirar as colunas sobre vento da tabela~~
2) Tornar a tabela responsiva
3) Verificar responsividade da página em si
4) Talvez adicionar um botão para mostrar mais linhas da tabela

### Página "Graphs": 
~~1) Verificar responsividade da página em si~~
~~2) Verificar responsividade dos gráficos~~
3) Adicionar mais gráficos? (precipitação/cloudcover/prob. de chuva)

### Banco de dados:
~~1) Salvar o cloudcover no banco de dados~~
~~2) Salvar precipitação e probabilidade de chuva no banco~~
~~3) Arrumar a tabela de forma que não tenha mais as colunas de vento e tenha as novas~~
~~4) Mudar o nome da tabela para ficar mais aceitável (pura estética, "leituras" é muito genérico)~~

### Modelo:
~~1) Ver warning que aparece na predicao~~
2) Treinar o modelo sem as features de vento

### Geral:
1) Documentação do código seguindo padrão JSDoc (possível criar um arquivo de documentação a partir disso)
2) Deploy
3) Organização do código/arquivos
	- Dividir em mais módulos?

---

### Outras coisas:
1) Fazer o github em si (no modelo certo)
2) Padronizar tudo em ingles (código/pagina)
3) Fazer o requirements.txt